extern crate std;

use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal,
};

use crate::RentWallet;
use crate::RentWalletClient;
use rent_payments::RentPayments;
use rent_payments::RentPaymentsClient;
use staking_rewards::StakingRewards;
use staking_rewards::StakingRewardsClient;

#[test]
fn e2e_pay_rent_success_and_rollback_on_staking_failure() {
    let env = Env::default();

    // Register contracts
    let wallet_id = env.register(RentWallet, ());
    let payments_id = env.register(RentPayments, ());
    let rewards_id = env.register(StakingRewards, ());

    let wallet = RentWalletClient::new(&env, &wallet_id);
    let payments = RentPaymentsClient::new(&env, &payments_id);
    let rewards = StakingRewardsClient::new(&env, &rewards_id);

    // Setup identities
    let admin = Address::generate(&env);
    let payer = Address::generate(&env);

    // Init + wire addresses
    env.mock_all_auths();
    wallet.init(&admin);
    payments.init(&admin);
    rewards.init(&admin);

    wallet.set_rent_payments(&admin, &payments_id);
    payments.set_wallet(&admin, &wallet_id);

    payments.set_staking_rewards(&admin, &rewards_id);
    rewards.set_rent_payments(&admin, &payments_id);

    // Fund wallet
    wallet.credit(&admin, &payer, &1000i128);
    assert_eq!(wallet.balance(&payer), 1000i128);

    // ---- Success flow ----
    let deal_id: u64 = 42;
    let amount: i128 = 250;

    // Provide explicit auth for payer calling wallet.pay_rent
    env.mock_auths(&[MockAuth {
        address: &payer,
        invoke: &MockAuthInvoke {
            contract: &wallet_id,
            fn_name: "pay_rent",
            args: (payer.clone(), deal_id, amount).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let receipt_id = wallet.pay_rent(&payer, &deal_id, &amount);

    assert_eq!(wallet.balance(&payer), 750i128);
    assert_eq!(payments.receipt_count(&deal_id), 1u64);
    assert_eq!(receipt_id, 1u64);

    // ---- Failure + rollback flow ----
    // Pause staking rewards so rent_payments -> staking_rewards call fails and reverts whole tx
    env.mock_all_auths();
    rewards.pause(&admin);

    let deal_id2: u64 = 43;
    let amount2: i128 = 100;

    let bal_before = wallet.balance(&payer);
    let receipts_before = payments.receipt_count(&deal_id2);

    env.mock_auths(&[MockAuth {
        address: &payer,
        invoke: &MockAuthInvoke {
            contract: &wallet_id,
            fn_name: "pay_rent",
            args: (payer.clone(), deal_id2, amount2).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let res = wallet.try_pay_rent(&payer, &deal_id2, &amount2);
    assert!(res.is_err());

    // Atomic rollback checks
    assert_eq!(wallet.balance(&payer), bal_before);
    assert_eq!(payments.receipt_count(&deal_id2), receipts_before);
}
