import path from "path";
import {emulator, init, getAccountAddress, mintFlow, getFlowBalance,
        deployContractByName, getContractAddress, sendTransaction, executeScript} from "flow-js-testing";

jest.setTimeout(10000);

async function deployAll() {
  var [deploymentResult, error] = await deployContractByName({name: "NonFungibleToken"});
  var [deploymentResult, error] = await deployContractByName({name: "MetadataViews"});
  var [deploymentResult, error] = await deployContractByName({name: "DateUtils"});
  const NonFungibleToken = await getContractAddress("NonFungibleToken");
  const MetadataViews = await getContractAddress("MetadataViews");
  const DateUtils = await getContractAddress("DateUtils");
  [deploymentResult, error] = await deployContractByName({name: "DayNFT", addressMap: {NonFungibleToken, MetadataViews, DateUtils}});
}

describe("basic-test", ()=>{
  beforeEach(async () => {
    const basePath = path.resolve(__dirname, ".."); 
    const port = 8080; 
    const logging = false;
    
    await init(basePath, { port });
    return emulator.start(port, logging);
  });
  
  afterEach(async () => {
    return emulator.stop();
  });

  test("deposit", async () => {    
    await deployAll();
    
    const myself = await getContractAddress("DayNFT");
    const marketplace = await getAccountAddress("Marketplace");
    await mintFlow(marketplace, 50.0);

    // deposit a cut of fees from marketplace
    var [result, error] = await sendTransaction("deposit_flow", [marketplace], [10.0, myself]);
    expect(error).toBeNull();

    // verify that it all gets deposited into the contract's vault
    // (as there are no NFT holders)
    var [balance, error] = await getFlowBalance(myself);
    expect(balance).toEqual("1000000009.99600000");
  })

  test("dates", async () => {    
    var [deploymentResult, error] = await deployContractByName({name: "DateUtils"});

    // check that the contract can successfully convert timestamps to days
    const timestamp1 = Date.parse('04 Dec 2185 23:59:59 GMT')/1000
    var [result,error] = await executeScript("get_date_from_timestamp", [timestamp1]);
    expect(result).toEqual({"day": 4, "month": 12, "year": 2185});
    const timestamp2 = Date.parse('05 Dec 2185 00:00:01 GMT')/1000
    var [result,error] = await executeScript("get_date_from_timestamp", [timestamp2]);
    expect(result).toEqual({"day": 5, "month": 12, "year": 2185});
  })
  
  test("workflow", async () => {    
    await deployAll();
    
    // actors' addresses
    const alice = await getAccountAddress("Alice");
    const bob = await getAccountAddress("Bob");
    const myself = await getContractAddress("DayNFT");
    const marketplace = await getAccountAddress("Marketplace");
    
    // give some flow to users
    await mintFlow(alice, 12.0);
    var [balance, error] = await getFlowBalance(alice);
    expect(balance).toEqual("12.00100000");
    await mintFlow(bob, 50.0);
    await mintFlow(marketplace, 50.0);
    
    // simulate events over a few days
    const today = [25, 1, 2021];
    const yesterday = [24, 1, 2021];
    const day1 = [26, 1, 2021];
    const day2 = [27, 1, 2021];
    const day3 = [28, 1, 2021];

    // TODAY
    
    // bid on a different date than today (should give an error)
    var args = [10.0, "hello world", today, yesterday];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).not.toBeNull();

    // bid on today's nft by alice (title too long)
    var args = [10.0, "veery looooooooooooooooooooooooooooooooooooooooooooooooooooooooooong meeessaaaaaageeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", today, today];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).not.toBeNull();

    // bid on today's nft by alice
    var args = [10.0, "hello world", today, today];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).toBeNull();
    
    // verify alice's balance has decreased
    [balance, error] = await getFlowBalance(alice);
    expect(balance).toEqual("2.00100000");
    
    // verify best bid is recorded
    var [result,error] = await executeScript("read_best_bid_test", [today]);
    expect(result.amount).toEqual("10.00000000");
    expect(result.user).toEqual(alice);

    // make another bid by alice for a lower price
    var args = [1.5, "hey hey", today, today];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).toBeNull();

    // verify best bid hasn't changed
    var [result,error] = await executeScript("read_best_bid_test", [today]);
    expect(result.amount).toEqual("10.00000000");
    expect(result.user).toEqual(alice);

    // verify alice's balance hasn't changed
    [balance, error] = await getFlowBalance(alice);
    expect(balance).toEqual("2.00100000");

    // bid on today's nft by bob (for a higher amount)
    var args = [15.0, "hello world2", today, today];
    var [tx, error] = await sendTransaction("make_bid_test", [bob], args);
    expect(error).toBeNull();

    // verify bob's balance has decreased
    [balance, error] = await getFlowBalance(bob);
    expect(balance).toEqual("35.00100000");

    // verify alice's balance has been restored
    [balance, error] = await getFlowBalance(alice);
    expect(balance).toEqual("12.00100000");

    // verify that alice hasn't any NFTs to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [alice, today]);
    expect(result).toEqual(0);

    // verify that bob hasn't any NFTs to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [bob, today]);
    expect(result).toEqual(0);

    // DAY1

    // verify that alice hasn't any NFTs to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [alice, day1]);
    expect(result).toEqual(0);

    // verify that bob HAS some NFTs to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [bob, day1]);
    expect(result).toEqual(1);

    // claim NFTs for alice
    var [result, error] = await sendTransaction("claim_nfts_test", [alice], [day1]);
    expect(error).toBeNull();

    // claim NFTs for bob
    var [result, error] = await sendTransaction("claim_nfts_test", [bob], [day1]);
    expect(error).toBeNull();

    // verify contract balance (100% of bob's minting price because there were no NFT holders before bob)
    [balance, error] = await getFlowBalance(myself);
    expect(balance).toEqual("1000000014.99400000");
    
    // read total supply
    var [result,error] = await executeScript("read_total_supply", []);
    expect(result).toEqual(1);
    
    // read alice's NFT ids
    var [result,error] = await executeScript("read_collection_ids", [alice]);
    expect(result).toEqual([]);

    // read bob's NFT ids
    var [result,error] = await executeScript("read_collection_ids", [bob]);
    expect(result).toEqual([0]);

    // read bob's NFT
    var [result,error] = await executeScript("read_nft", [bob, 0]);
    var exp_res = {"date": {"day": 25, "month": 1, "year": 2021}, "dateStr": "25-01-2021", "description": "Minted on day-nft.io on 25-01-2021", "id": 0, "name": "DAY-NFT #25-01-2021", "thumbnail": "https://day-nft.io/imgs/0.png", "title": "hello world2"}
    exp_res["uuid"] = result["uuid"]
    expect(result).toEqual(exp_res);

    // verify if bob has any flow to claim
    var [result,error] = await executeScript("read_tokens_to_claim", [bob]);
    expect(result).toEqual("0.00000000");

    // claim tokens (even if there's none)
    var [result, error] = await sendTransaction("claim_tokens", [bob], []);
    expect(error).toBeNull();

    // bid on today's nft by alice
    var args = [5.0, "hello world3", day1, day1];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).toBeNull();


    // DAY2
    // bid on today's nft by alice (this should assign yesterday's nft to her)
    var args = [2.0, "hey you", day2, day2];
    var [tx, error] = await sendTransaction("make_bid_test", [alice], args);
    expect(error).toBeNull();

    // verify that alice has one NFT to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [alice, day2]);
    expect(result).toEqual(1);

    // bob should get a cut of the price paid by alice (5.0 * 50% / 1)
    var [result,error] = await executeScript("read_tokens_to_claim", [bob]);
    expect(result).toEqual("2.50000000");
    
    // claim tokens
    var [result, error] = await sendTransaction("claim_tokens", [bob], []);
    expect(error).toBeNull();

    // verify bob's balance has increased
    [balance, error] = await getFlowBalance(bob);
    expect(balance).toEqual("37.50100000");

    // there should be nothing more to claim
    var [result,error] = await executeScript("read_tokens_to_claim", [bob]);
    expect(result).toEqual("0.00000000");


    // DAY3
    // verify that alice has two NFTs to claim
    var [result,error] = await executeScript("read_nb_nfts_to_claim_test", [alice, day3]);
    expect(result).toEqual(2);

    // claim NFTs for alice
    var [result, error] = await sendTransaction("claim_nfts_test", [alice], [day3]);
    expect(error).toBeNull();

    // read alice's NFT ids
    var [result,error] = await executeScript("read_collection_ids", [alice]);
    expect(new Set(result)).toEqual(new Set([1, 2]));

    // alice should get a cut of her latest NFT because she already held one (2 * 50% / 2)
    var [result,error] = await executeScript("read_tokens_to_claim", [alice]);
    expect(result).toEqual("0.50000000");

    // same for bob
    var [result,error] = await executeScript("read_tokens_to_claim", [bob]);
    expect(result).toEqual("0.50000000");

    // deposit a cut of fees from marketplace
    var [result, error] = await sendTransaction("deposit_flow", [marketplace], [10.0, myself]);
    expect(error).toBeNull();

    // verify that 50% of it gets deposited into the contract's vault
    var [balance, error] = await getFlowBalance(myself);
    expect(balance).toEqual("1000000023.49400000");
    
  })
})
