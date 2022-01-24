import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { Transaction } from "./Transaction";

function App() {
  const [user, setUser] = useState({ loggedIn: null })
  const [flowBalance, setFlowBalance] = useState(false)
  const [flowToClaim, setFlowToClaim] = useState(null)
  const [NFTsToClaim, setNFTsToClaim] = useState(null)
  const [bestBid, setBestBid] = useState(null)
  const [message, setMessage] = useState(null)
  const [flowBid, setFlowBid] = useState(null)
  const [transactionInProgress, setTransactionInProgress] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [transactionError, setTransactionError] = useState(null)
  const [txId, setTxId] = useState(null)
  
  async function onAuthenticate(user) {
    setUser(user)
    if (user?.addr != null) {
      const account = await fcl.account(user.addr);
      setFlowBalance(account.balance / 100000000);
      getFlowToClaim(user.addr);
      getNFTsToClaim(user.addr);
      getBestBid();
    } 
  }

  useEffect(() => fcl.currentUser.subscribe(onAuthenticate), [])

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
    setBestBid(null)
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

        pub fun main(): UFix64 {
            return DayNFT.getBestBid()
        }
      `,
      args: []
    })

    setBestBid(Math.round(bestBid * 1000) / 1000)
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
    
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT
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
                let date = DayNFT.Date(day: date_arr[0], month: date_arr[1], year: date_arr[2])
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
    let today = new Date();
    let day = today.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    let month = (today.getUTCMonth()+1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    let year = today.getUTCFullYear()
    
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT
        import NonFungibleToken from 0xNonFungibleToken
        import FlowToken from 0xFlowToken

        transaction() {

            let address: Address

            prepare(signer: AuthAccount) {
                if (signer.getCapability(DayNFT.CollectionPublicPath)
                    .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DayNFT.createEmptyCollection()
                    signer.save(<-collection, to: DayNFT.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>(
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

  const AuthedState = () => {
    return (
      <div>       
        <button onClick={logOut}>LOGOUT</button>
        <div>Logged in as: {user?.addr ?? "No Address"}</div>
        <div>Flow balance: {flowBalance ?? "ND"}</div>
        <div style={{display: 'flex', alignItems:'center'}}>
          Flow to claim: {flowToClaim ?? 0}
          {flowToClaim > 0?
            <button style={{marginLeft: '10px'}} onClick={logOut}>CLAIM FLOW</button>
            :<span></span>
          }
        </div>
        <div style={{display: 'flex', alignItems:'center'}}>
          NFTs to claim: {NFTsToClaim}
          {NFTsToClaim > 0?
            <button style={{marginLeft: '10px'}} onClick={claimNFTs}>CLAIM NFTs</button>
            :<span></span>
          }
        </div>
      </div>
    )
  }

  const UnauthenticatedState = () => {
    return (
      <div>
        <button onClick={fcl.authenticate}>WALLET</button>
      </div>
    )
  }

  const WelcomeText = (props) => {
    return (
    <div className="center-text">
      {!props.loggedIn?
        <ul>
          <li>You can post bids for the daily NFT by customizing it with your own message and automatically generated image.</li>
          <li>Only one NFT is minted every day on the Flow blockchain to the highest bidder.</li>
          <li>50% of all Flow obtained from the mints and transfer costs is redistributed back to the NFT holders in equal proportions.</li>
        </ul>
        :<span></span>
      }
      {props.loggedIn
        ? <p>Current best bid: {bestBid ?? "ND"} Flow</p>
        : <p>"Connect your wallet and make your bid!"</p>
      }

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
        <div>
        <WelcomeText loggedIn={user?.loggedIn} />
        <div style={{display: user?.loggedIn ? 'block' : 'none' }}>
          <div>
            <input style={{marginBottom:'10px'}} type="text" id="msg" name="msg" placeholder="Message" onChange={(e) => setMessage(e.target.value)}/>      
            <div style={{display: 'flex', alignItems:'center'}}>
              <input style={{width: '30%', marginBottom:0}} type="number" step=".001" id="flowBid" name="flowBid" placeholder="Flow" onChange={(e) => setFlowBid(e.target.value)}/>
              <button style={{marginLeft: '10px'}} onClick={makeBid}>BID</button>
            </div>
          </div>
          <div style={{marginTop: '20px'}} id="p5sketch" className="center"></div>
        </div>
        </div>
        <div>
          <div className="center">
            {user?.loggedIn
              ? <AuthedState />
              : <UnauthenticatedState />
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;