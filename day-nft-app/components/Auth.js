import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { Transaction } from "./Transaction";


function App() {
  const [user, setUser] = useState({ loggedIn: null })
  const [flowBalance, setFlowBalance] = useState(null)
  const [flowToClaim, setFlowToClaim] = useState(null)
  const [NFTsToClaim, setNFTsToClaim] = useState(null)
  const [bestBid, setBestBid] = useState(null)
  const [bestBidTitle, setBestBidTitle] = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [message, setMessage] = useState(null)
  const [flowBid, setFlowBid] = useState(null)
  const [transactionInProgress, setTransactionInProgress] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [transactionError, setTransactionError] = useState(null)
  const [txId, setTxId] = useState(null)
  const [timeToAuctionEnd, setTimeToAuctionEnd] = useState("")

  
  async function onAuthenticate(user) {
    setUser(user)
    if (user?.addr != null) {
      const account = await fcl.account(user.addr);
      setFlowBalance(Math.round(account.balance / 100000000 * 100) / 100);
      getFlowToClaim(user.addr);
      getNFTsToClaim(user.addr);
      getBestBid();
      getBestBidTitle();
      getCurrentId();
    } 
  }

  useEffect(() => {fcl.currentUser.subscribe(onAuthenticate)
                   getBestBid()
                   getBestBidTitle()
                   getCurrentId()}, 
                  [])

  function initTransactionState() {
    setTransactionInProgress(true)
    setTransactionStatus(-1)
    setTransactionError(null)
  }

  const logOut = async () => {
    const logout = await fcl.unauthenticate()
    setUser(null)
    setFlowToClaim(null)
    setNFTsToClaim(null)
    setMessage(null)
    setFlowBid(null)
  }

  const getFlowToClaim = async (address) => {
    try{
      // this throws when NFT collection is not initialized
      const flowToClaim = await fcl.query({
        cadence: `
          import DayNFT from 0xDayNFT

          pub fun main(address: Address): UFix64 {
              return DayNFT.tokensToClaim(address: address)
          }
        `,
        args: (arg, t) => [arg(address, t.Address)]
      })

      setFlowToClaim(flowToClaim)
    } catch(e){}
  }
  
  const getNFTsToClaim = async (address) => {
    const NFTsToClaim = await fcl.query({
      cadence: `
        import DayNFT from 0xDayNFT

        pub fun main(address: Address): Int {
            return DayNFT.nbNFTsToClaim(address: address)
        }
      `,
      args: (arg, t) => [arg(address, t.Address)]
    })

    setNFTsToClaim(NFTsToClaim)
  }

  const getBestBid = async () => {
    const bestBid = await fcl.query({
      cadence: `
        import DayNFT from 0xDayNFT

        pub fun main(): DayNFT.PublicBid {
            return DayNFT.getBestBid()
        }
      `,
      args: []
    })

    setBestBid(bestBid)
  }

  const getBestBidTitle = async () => {
    const bestBidTitle = await fcl.query({
      cadence: `
        import DayNFT from 0xDayNFT

        pub fun main(): String? {
            return DayNFT.getBestBidTitle()
        }
      `,
      args: []
    })
    setBestBidTitle(bestBidTitle)
  }

  const getCurrentId = async () => {
    var currentId = await fcl.query({
      cadence: `
        import DayNFT from 0xDayNFT

        pub fun main(): UInt64 {
            return DayNFT.totalSupply
        }
      `,
      args: []
    })
    setCurrentId(currentId)
  }
  
  async function updateTx(res) {
    setTransactionStatus(res.status)
    setTransactionError(res.errorMessage)
    if (res.status === 4) {
      onAuthenticate(user)
    }
  }

  const makeBid = async () => {
    let today = new Date();
    let day = today.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    let month = (today.getUTCMonth()+1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    let year = today.getUTCFullYear()

    if(message == null || flowBid == null) {
        return
    }
    
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT
        import DateUtils from 0xDateUtils
        import FlowToken from 0xFlowToken

        transaction(bidAmount: UFix64, title: String, date_arr: [Int]) {

            let vault: @FlowToken.Vault
            let address: Address

            prepare(signer: AuthAccount) {
                let mainVault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                            ?? panic("Could not borrow a reference to the flow vault")
                self.vault <- mainVault.withdraw(amount: bidAmount) as! @FlowToken.Vault
                self.address = signer.address     
            }

            execute { 
                let date = DateUtils.Date(day: date_arr[0], month: date_arr[1], year: date_arr[2])
                DayNFT.makeBid(vault: <-self.vault, 
                                recipient: self.address,
                                title: title,
                                date: date)
            }
        }
      `,
      args: (arg, t) => [
        arg(parseFloat(flowBid).toFixed(6), t.UFix64),
        arg(message, t.String),
        arg([parseInt(day), parseInt(month), parseInt(year)], t.Array(t.Int))
      ],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }

  const claimNFTs = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT
        import NonFungibleToken from 0xNonFungibleToken
        import MetadataViews from 0xMetadataViews

        transaction() {

            let address: Address

            prepare(signer: AuthAccount) {
                if (signer.getCapability(DayNFT.CollectionPublicPath)
                    .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DayNFT.createEmptyCollection()
                    signer.save(<-collection, to: DayNFT.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DayNFT.Collection{DayNFT.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DayNFT.CollectionPublicPath,
                        target: DayNFT.CollectionStoragePath
                    )
                }
                self.address = signer.address     
            }

            execute { 
                DayNFT.claimNFTs(address: self.address)
            }
        }
      `,
      args: (arg, t) => [],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }

  const claimFlow = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT

        transaction() {

            let address: Address

            prepare(signer: AuthAccount) {
                self.address = signer.address     
            }

            execute { 
                DayNFT.claimTokens(address: self.address)
            }
        }
      `,
      args: (arg, t) => [],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }

  function calcTimeToAuctionEnd() {
    let today = new Date();
    var res = ""
    let hours = 23 - today.getUTCHours()
    let minutes = 59 - today.getUTCMinutes()
    let seconds = 59 - today.getUTCSeconds()

    res = hours.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":"
          + minutes.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":"
          + seconds.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    setTimeToAuctionEnd(res)
    if (hours == 23 && minutes == 59 && seconds == 59) {
      onAuthenticate(user)
    }
  }

  //setInterval(calcTimeToAuctionEnd, 1000);

  useEffect(() => {
    let timer = setInterval(calcTimeToAuctionEnd, 1000);

    return () => {
      clearInterval(timer);
    }
  }, [])
  

  const WelcomeText = (props) => {
    return (
    <div className="center-text">
          <div>
            <p>Current best bid: {bestBid? <span>{Math.round(bestBid?.amount * 100) / 100} Flow </span> : ""}</p>
            {props.loggedIn && bestBid?.user == user?.addr ? <p className="bestBid">You hold the current best bid!</p>:<span></span>}
            <p>Auction over in {timeToAuctionEnd}</p>
          </div>


    </div>
    )
  }

  function hideTx() {
    setTransactionInProgress(false)
  }

  return (
    <div>
      {transactionInProgress
        ? <Transaction transactionStatus={transactionStatus} transactionError={transactionError} txId={txId} hideTx={hideTx} />
        : <span></span>
      }
      <div className="grid">
        <div id="left-panel">
        <WelcomeText loggedIn={user?.loggedIn} />
        <div id="bid-container">
          <div style={{display: user?.loggedIn ? 'block' : 'none' }}>
            <input style={{marginBottom:'10px'}} type="text" id="msg" name="msg" maxLength="70" placeholder="Message" onChange={(e) => setMessage(e.target.value)}/>      
            <div style={{display: 'flex', alignItems:'center'}}>
              <input style={{width: '30%', marginBottom:0}} type="number" step=".001" id="flowBid" name="flowBid" placeholder="Flow" onChange={(e) => setFlowBid(e.target.value)}/>
              <button style={{marginLeft: '10px'}} onClick={makeBid}>BID</button>
            </div>
            {flowBalance != null && flowBalance <= 0
                ?<p className="fundAccountMsg">Please <a href="https://blocto.portto.io/" target="_blank" rel="noopener noreferrer">fund</a> your account before bidding</p>
                :<span></span>
            }
          </div>
          <div id="p5sketch" className="center">
          <span id="best_bid_msg" value={bestBidTitle != null && bestBid?.user != "0x0000000000000000"? bestBidTitle : "Don't let me burn!"}></span>
          </div>
          <p className="center" style={{marginBottom:'30px'}}>{currentId != null ? <span>#{bestBidTitle != null? currentId : currentId+1}</span> : ""}</p>
        </div>
        </div>
        <div id="right-panel">
          <div className="center">
            {user?.loggedIn
              ? <div>
                  <div className="infoList">Address: {user.addr}</div>
                  <div className="infoList" style={{display: 'flex', alignItems:'center'}}>
                    Flow balance: {flowBalance ?? "ND"}
                  </div>
                  <div className="infoList" style={{display: 'flex', alignItems:'center'}}>
                    Flow to claim: {Math.round(flowToClaim * 100) / 100}
                    {flowToClaim > 0?
                      <button style={{marginLeft: '10px'}} onClick={claimFlow}>CLAIM</button>
                      :<span></span>
                    }
                  </div>
                  <div className="infoList" style={{display: 'flex', alignItems:'center'}}>
                    NFTs to claim: {NFTsToClaim}
                    {NFTsToClaim > 0?
                      <button style={{marginLeft: '10px'}} onClick={claimNFTs}>CLAIM</button>
                      :<span></span>
                    }
                  </div>
                  <button onClick={logOut}>LOGOUT</button>
                </div>
              : <div>
                  <button onClick={fcl.authenticate}>CONNECT</button>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;
