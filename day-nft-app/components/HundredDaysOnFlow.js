import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { Transaction } from "./Transaction";

const seriesID = 269750036;

function App() {
  const [user, setUser] = useState({ loggedIn: null })
  const [flowBalance, setFlowBalance] = useState(null)
  const [transactionInProgress, setTransactionInProgress] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [transactionError, setTransactionError] = useState(null)
  const [txId, setTxId] = useState(null)
  const [totalSupply, setTotalSupply] = useState(null)
  const [nbDayNFTwlToMint, setNbDayNFTwlToMint] = useState(null)
  const [nbPublicToMint, setNbPublicToMint] = useState(null)
  const [hasWlToMint, setHasWlToMint] = useState(null)

  
  async function onAuthenticate(user) {
    setUser(user)
    if (user?.addr != null) {
      const account = await fcl.account(user.addr);
      setFlowBalance(Math.round(account.balance / 100000000 * 100) / 100);
      getTotalSupply();
      getNbDayNFTwlToMint(user.addr);
      getHasWlToMint(user.addr);
      getNbPublicToMint();
    } 
  }

  useEffect(() => {fcl.currentUser.subscribe(onAuthenticate)
                   getTotalSupply()}, 
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
    setTotalSupply(null)
  }

  const getTotalSupply = async () => {
    var supply = await fcl.query({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow

        pub fun main(seriesId: UInt64): UInt64 {
            let series = DaysOnFlow.getSeries(seriesId: seriesId)
            return series.totalSupply
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64)]
    })
    setTotalSupply(supply)
  }

  const getNbDayNFTwlToMint = async (address) => {
    var nb = await fcl.query({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow

        pub fun main(seriesId: UInt64, address: Address): Int {
            let series = DaysOnFlow.getSeries(seriesId: seriesId)
            return series.nbDayNFTwlToMint(address: address)
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64), arg(address, t.Address)]
    })
    setNbDayNFTwlToMint(nb)
  }


  const getNbPublicToMint = async () => {
    var nb = await fcl.query({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow

        pub fun main(seriesId: UInt64): Int {
            let series = DaysOnFlow.getSeries(seriesId: seriesId)
            return series.nbPublicToMint()
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64)]
    })
    setNbPublicToMint(nb)
  }


  const getHasWlToMint = async (address) => {
    var nb = await fcl.query({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow

        pub fun main(seriesId: UInt64, address: Address): Bool {
            let series = DaysOnFlow.getSeries(seriesId: seriesId)
            return series.hasWlToMint(address: address)
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64), arg(address, t.Address)]
    })
    setHasWlToMint(nb)
  }
  
  async function updateTx(res) {
    setTransactionStatus(res.status)
    setTransactionError(res.errorMessage)
    if (res.status === 4) {
      onAuthenticate(user)
    }
  }

  const mintDayNFTwl = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow
        import NonFungibleToken from 0xNonFungibleToken
        import MetadataViews from 0xMetadataViews

        transaction(seriesId: UInt64) {

            let address: Address
            
            prepare(signer: AuthAccount) {
                if (signer.getCapability(DaysOnFlow.CollectionPublicPath)
                    .borrow<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DaysOnFlow.createEmptyCollection()
                    signer.save(<-collection, to: DaysOnFlow.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DaysOnFlow.CollectionPublicPath,
                        target: DaysOnFlow.CollectionStoragePath
                    )
                }

                self.address = signer.address 
            }

            execute { 
                let series = DaysOnFlow.getSeries(seriesId: seriesId)
                series.mintDayNFTwl(address: self.address)
            }
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }

  const mintWl = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow
        import NonFungibleToken from 0xNonFungibleToken
        import MetadataViews from 0xMetadataViews

        
        transaction(seriesId: UInt64, bidAmount: UFix64) {

            let address: Address
            let vault: @FlowToken.Vault
            
            prepare(signer: AuthAccount) {
                if (signer.getCapability(DaysOnFlow.CollectionPublicPath)
                    .borrow<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DaysOnFlow.createEmptyCollection()
                    signer.save(<-collection, to: DaysOnFlow.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DaysOnFlow.CollectionPublicPath,
                        target: DaysOnFlow.CollectionStoragePath
                    )
                }

                let mainVault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                            ?? panic("Could not borrow a reference to the flow vault")
                self.vault <- mainVault.withdraw(amount: bidAmount) as! @FlowToken.Vault

                self.address = signer.address 
            }

            execute { 
                let series = DaysOnFlow.getSeries(seriesId: seriesId)
                series.mintWl(address: self.address, vault: <- self.vault)
            }
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64), arg(0.0, t.UFix64)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }

  const mintPublic = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DaysOnFlow from 0xDaysOnFlow
        import NonFungibleToken from 0xNonFungibleToken
        import MetadataViews from 0xMetadataViews

        
        transaction(seriesId: UInt64, bidAmount: UFix64) {

            let address: Address
            let vault: @FlowToken.Vault
            
            prepare(signer: AuthAccount) {
                if (signer.getCapability(DaysOnFlow.CollectionPublicPath)
                    .borrow<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DaysOnFlow.createEmptyCollection()
                    signer.save(<-collection, to: DaysOnFlow.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DaysOnFlow.CollectionPublicPath,
                        target: DaysOnFlow.CollectionStoragePath
                    )
                }

                let mainVault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                            ?? panic("Could not borrow a reference to the flow vault")
                self.vault <- mainVault.withdraw(amount: bidAmount) as! @FlowToken.Vault

                self.address = signer.address 
            }

            execute { 
                let series = DaysOnFlow.getSeries(seriesId: seriesId)
                series.mintPublic(address: self.address, vault: <- self.vault)
            }
        }
      `,
      args: (arg, t) => [arg(seriesID, t.UInt64), arg(2.2, t.UFix64)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
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
        <div className="center-text">
          <div>
            <p className="center">100 Days On Flow</p>
          </div>
        </div>
        <div id="bid-container">
          <div id="p5sketch" className="center">
            <img src="https://ipfs.io/ipfs/QmeRFxp5Gd1i16ox98nWK96Ls2cvo4ZusiSxEGHz1ztJ9q"/>
            
          </div>
          <p className="center" style={{marginBottom:'30px', marginTop:'20px'}}>{totalSupply}/222 minted</p>
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
                    Holders WL (free):
                    {nbDayNFTwlToMint > 0?
                      <button style={{marginLeft: '10px'}} onClick={mintDayNFTwl}>MINT {nbDayNFTwlToMint}</button>
                      :<span style={{marginLeft: '10px'}}>NA</span>
                    }
                  </div>
                  <div className="infoList" style={{display: 'flex', alignItems:'center'}}>
                    WL (free):
                    {hasWlToMint?
                      <button style={{marginLeft: '10px'}} onClick={mintWl}>MINT 1</button>
                      :<span style={{marginLeft: '10px'}}>NA</span>
                    }
                  </div>
                  <div className="infoList" style={{display: 'flex', alignItems:'center'}}>
                    Public (2.2 $FLOW) ({nbPublicToMint} left):
                    {nbPublicToMint > 0?
                      <button style={{marginLeft: '10px'}} onClick={mintPublic}>MINT 1</button>
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
