import 'mocha';
import * as chai from 'chai';
import BigNumber from 'bignumber.js';
import { chaiSetup } from './utils/chai_setup';
import { RemainingFillableCalculator } from '../src/order_watcher/remaining_fillable_calculator';
import { SignedOrder, ECSignature } from '../src/types';
import { TokenUtils } from './utils/token_utils';
import { ZeroEx } from '../src/0x';

chaiSetup.configure();
const expect = chai.expect;

describe.only('RemainingFillableCalculator', () => {
    let calculator: RemainingFillableCalculator;
    let signedOrder: SignedOrder;
    let makerToken: string;
    let takerToken: string;
    let zrxToken: string;
    let transferrableMakerTokenAmount: BigNumber;
    let transferrableMakerFeeTokenAmount: BigNumber;
    let remainingMakerTokenAmount: BigNumber;
    let makerAmount: BigNumber;
    let takerAmount: BigNumber;
    let makerFee: BigNumber;
    const zero: BigNumber = new BigNumber(0);
    const zeroAddress = '0x0';
    const signature: ECSignature = { v: 27, r: '', s: ''};
    beforeEach(async () => {
        [makerToken, takerToken, zrxToken] = ['0x1', '0x2', '0x3'];
        [makerAmount, takerAmount, makerFee] = [ZeroEx.toBaseUnitAmount(new BigNumber(50), 18),
                                                ZeroEx.toBaseUnitAmount(new BigNumber(5), 18),
                                                ZeroEx.toBaseUnitAmount(new BigNumber(1), 18)];
        [transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount] = [
                                                ZeroEx.toBaseUnitAmount(new BigNumber(50), 18),
                                                ZeroEx.toBaseUnitAmount(new BigNumber(5), 18)];
    });
    function buildSignedOrder(): SignedOrder {
        return { ecSignature: signature,
                 exchangeContractAddress: zeroAddress,
                 feeRecipient: zeroAddress,
                 maker: zeroAddress,
                 taker: zeroAddress,
                 makerFee: (makerFee || zero),
                 takerFee: zero,
                 makerTokenAmount: makerAmount,
                 takerTokenAmount: takerAmount,
                 makerTokenAddress: makerToken,
                 takerTokenAddress: takerToken,
                 salt: zero,
                 expirationUnixTimestampSec: zero };
    }
    describe('Maker token is NOT ZRX', () => {
        it('calculates the correct amount when balance is less than remaining fillable', () => {
            signedOrder = buildSignedOrder();
            const partiallyFilledAmount = ZeroEx.toBaseUnitAmount(new BigNumber(2), 18);
            remainingMakerTokenAmount = signedOrder.makerTokenAmount.minus(partiallyFilledAmount);
            transferrableMakerTokenAmount = remainingMakerTokenAmount.minus(partiallyFilledAmount);
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(transferrableMakerTokenAmount);
        });
        it('calculates the correct amount when unfilled and funds available', () => {
            signedOrder = buildSignedOrder();
            remainingMakerTokenAmount = signedOrder.makerTokenAmount;
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(remainingMakerTokenAmount);
        });
        it('calculates the correct amount when partially filled and funds available', () => {
            signedOrder = buildSignedOrder();
            remainingMakerTokenAmount = ZeroEx.toBaseUnitAmount(new BigNumber(1), 18);
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(remainingMakerTokenAmount);
        });
        it('calculates the amount to be 0 when all fee funds are transferred', () => {
            signedOrder = buildSignedOrder();
            transferrableMakerFeeTokenAmount = zero;
            remainingMakerTokenAmount = signedOrder.makerTokenAmount;
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(zero);
        });
    });
    describe('Maker Token is ZRX', () => {
        beforeEach(async () => {
            makerToken = zrxToken;
        });
        it('calculates the correct amount when balance is less than remaining fillable', () => {
            signedOrder = buildSignedOrder();
            const partiallyFilledAmount = ZeroEx.toBaseUnitAmount(new BigNumber(2), 18);
            remainingMakerTokenAmount = signedOrder.makerTokenAmount.minus(partiallyFilledAmount);
            transferrableMakerTokenAmount = remainingMakerTokenAmount.minus(partiallyFilledAmount);
            transferrableMakerFeeTokenAmount = transferrableMakerTokenAmount;
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(transferrableMakerTokenAmount);
        });
        it('calculates the correct amount when unfilled and funds available', () => {
            signedOrder = buildSignedOrder();
            transferrableMakerTokenAmount = makerAmount.plus(makerFee);
            transferrableMakerFeeTokenAmount = transferrableMakerTokenAmount;
            remainingMakerTokenAmount = signedOrder.makerTokenAmount;
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(remainingMakerTokenAmount);
        });
        it('calculates the correct amount when partially filled and funds available', () => {
            signedOrder = buildSignedOrder();
            remainingMakerTokenAmount = ZeroEx.toBaseUnitAmount(new BigNumber(1), 18);
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(remainingMakerTokenAmount);
        });
        it('calculates the amount to be 0 when all fee funds are transferred', () => {
            signedOrder = buildSignedOrder();
            transferrableMakerTokenAmount = zero;
            transferrableMakerFeeTokenAmount = zero;
            remainingMakerTokenAmount = signedOrder.makerTokenAmount;
            calculator = new RemainingFillableCalculator(signedOrder, zrxToken,
                           transferrableMakerTokenAmount, transferrableMakerFeeTokenAmount, remainingMakerTokenAmount);
            expect(calculator.computeRemainingMakerFillable()).to.be.bignumber.equal(zero);
        });
    });
});
