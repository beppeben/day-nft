import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { Transaction } from "./Transaction";

function App() {
  const [user, setUser] = useState({ loggedIn: null })
  const [NFTIds, setNFTIds] = useState([])
  const [DOFInfo, setDOFInfo] = useState([])
  const [NFTToTransfer, setNFTToTransfer] = useState(null)
  const [toAddress, setToAddress] = useState(null)
  const [transactionInProgress, setTransactionInProgress] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [transactionError, setTransactionError] = useState(null)
  const [txId, setTxId] = useState(null)
  const [isDaysOnFlow, setIsDaysOnFlow] = useState(false)
  
  async function onAuthenticate(user) {
    setUser(user)
    if (user?.addr != null) {
      getDayNFTIds(user.addr);
      //getDOFInfo(user.addr);
    } 
  }

  useEffect(() => fcl.currentUser.subscribe(onAuthenticate), [])

  const logOut = async () => {
    const logout = await fcl.unauthenticate()
    setUser(null)
    setNFTIds([])
    setDOFInfo([])
    setNFTToTransfer(null)
    setToAddress(null)
  }

  function initTransactionState() {
    setTransactionInProgress(true)
    setTransactionStatus(-1)
    setTransactionError(null)
  }

  function hideTx() {
    setTransactionInProgress(false)
  }

  async function updateTx(res) {
    setTransactionStatus(res.status)
    setTransactionError(res.errorMessage)
    if (res.status === 4) {
      onAuthenticate(user)
    }
  }

  const setupAccount = async () => {
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT
        import DaysOnFlow from 0xDaysOnFlow
        import NonFungibleToken from 0xNonFungibleToken
        import MetadataViews from 0xMetadataViews

        transaction() {

            prepare(signer: AuthAccount) {
                if (signer.getCapability(DayNFT.CollectionPublicPath)
                    .borrow<&{DayNFT.CollectionPublic}>() == nil) {
                    // Create a Collection resource and save it to storage
                    let collection <- DayNFT.createEmptyCollection()
                    signer.save(<-collection, to: DayNFT.CollectionStoragePath)

                    // create a public capability for the collection
                    signer.link<&DayNFT.Collection{DayNFT.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DayNFT.CollectionPublicPath,
                        target: DayNFT.CollectionStoragePath
                    )
                } else if (signer.getCapability(DayNFT.CollectionPublicPath)
                    .borrow<&DayNFT.Collection{MetadataViews.ResolverCollection}>() == nil) {

                    // extend the public capability for the collection
                    signer.unlink(DayNFT.CollectionPublicPath)
                    signer.link<&DayNFT.Collection{DayNFT.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(
                        DayNFT.CollectionPublicPath,
                        target: DayNFT.CollectionStoragePath
                    )
                }
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
  
  const getDayNFTIds = async (address) => {
    try{
      // this throws when NFT collection is not initialized
      const ids = await fcl.query({
        cadence: `
          import DayNFT from 0xDayNFT

          pub fun main(account: Address): [UInt64] {
              let collectionRef = getAccount(account)
                  .getCapability(DayNFT.CollectionPublicPath)
                  .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>()
                  ?? panic("Could not get reference to the NFT Collection")

              return collectionRef.getIDs()
          }
        `,
        args: (arg, t) => [arg(address, t.Address)]
      })
      setNFTIds(ids.sort((a, b) => a - b))
    } catch(e){}
  }

  const getDOFInfo = async (address) => {
    try{
      // this throws when NFT collection is not initialized
      var info = await fcl.query({
        cadence: `
            import DaysOnFlow from 0xDaysOnFlow

            pub struct DOFInfo {
                pub let id: UInt64
                pub let serial: UInt64
                pub let image: String
                pub let seriesId: UInt64

                init(id: UInt64,
                      serial: UInt64, 
                      image: String,
                      seriesId: UInt64) {
                    self.id = id
                    self.serial = serial
                    self.image = image
                    self.seriesId = seriesId
                }
            }

            pub fun main(account: Address): [DOFInfo] {
                let collectionRef = getAccount(account)
                  .getCapability(DaysOnFlow.CollectionPublicPath)
                  .borrow<&DaysOnFlow.Collection{DaysOnFlow.CollectionPublic}>()
                  ?? panic("Could not get reference to the NFT Collection")
                
                let res: [DOFInfo] = []

                for id in collectionRef.getIDs() {
                    let nft = collectionRef.borrowDOF(id: id)!
                    let info = DOFInfo(id: id, serial: nft.serial, image: nft.seriesImage, seriesId: nft.seriesId)
                    res.append(info)
                }
                return res
            }
        `,
        args: (arg, t) => [arg(address, t.Address)]
      })
      info = info.sort((a, b) => a.serial - b.serial)
      var array_info = []
      info.forEach(e => array_info.push([e.id, e.serial, e.image, e.seriesId]))
      setDOFInfo(array_info)
    } catch(e){console.log(e)}
  }

  const transferNFT = async () => {
    if(NFTToTransfer == null || toAddress == null) {
        return
    }
     
    initTransactionState()
    const transactionId = await fcl.mutate({
      cadence: `
        import DayNFT from 0xDayNFT

        transaction(id: UInt64, toAddress: Address) {

            let collection: &DayNFT.Collection

            prepare(signer: AuthAccount) {
                self.collection = signer.borrow<&DayNFT.Collection>(from: DayNFT.CollectionStoragePath)
                    ?? panic("Could not get sender's Collection")    
            }

            execute { 
                let receiver = getAccount(toAddress)
                    .getCapability(DayNFT.CollectionPublicPath)
                    .borrow<&{DayNFT.CollectionPublic}>()
                    ?? panic("Could not get receiver reference to the NFT Collection")

                let nft <- self.collection.withdraw(withdrawID: id)
                receiver.deposit(token: <-nft)
            }
        }
      `,
      args: (arg, t) => [
        arg(parseInt(NFTToTransfer), t.UInt64),
        arg(toAddress, t.Address)
      ],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000
    })
    setTxId(transactionId);
    fcl.tx(transactionId).subscribe(updateTx)
  }
 
  const WelcomeText = (props) => {
    return (
    <div className="center-text">
      <h2>My Collection</h2>
    </div>
    )
  }

  return (
    <div>
      {transactionInProgress
        ? <Transaction transactionStatus={transactionStatus} transactionError={transactionError} txId={txId} hideTx={hideTx} />
        : <span></span>
      }
      <div className="grid">
        <div>
          <WelcomeText />
          {NFTIds.length == 0?
            <button style={{marginLeft: '10px'}} onClick={setupAccount}>SETUP ACCOUNT</button>
            :<span></span>
          }
          <div>
            <div style={{display: 'flex', margin: '5px', padding:'5px', justifyContent: 'center'}}>
                <input type="radio" id="daynft-radio" name="collection_id" value="0" style={{marginLeft: '10px', marginTop: '0px', width: '1em', height: '1em'}} onChange={(e) => setIsDaysOnFlow(false)} checked={!isDaysOnFlow}/>
                <p className="center" style={{marginRight: '20px'}}>DayNFT</p> 
                <input type="radio" id="dof-radio" name="collection_id" value="1" style={{marginLeft: '10px', marginTop: '0px', width: '1em', height: '1em'}} onChange={(e) => setIsDaysOnFlow(true)}/>
                <p className="center">Days On Flow</p> 
            </div>
          </div>
          {NFTToTransfer?
              <div style={{marginLeft: '10px'}}>
              <span>Send ID #{NFTToTransfer} to: </span>
              <div style={{display: 'flex', alignItems:'center'}}>
               
                  <input style={{marginBottom:'0', width: '330px'}} type="text" id="address" name="address" placeholder="Address" onChange={(e) => setToAddress(e.target.value)}/>   
                  <button style={{marginLeft: '10px'}} onClick={transferNFT}>SEND</button>
              </div>
              </div>
              :<span></span>
          }
          {isDaysOnFlow?
          DOFInfo.map((value, index) => {
            return  <div className="collection-img" key={index}>
                        <a alt={value[0]} href={"https://ipfs.io/ipfs/" + value[2]}><img src={"https://ipfs.io/ipfs/" + value[2]}/></a>
                        <div style={{display: 'flex', margin: '5px', padding:'5px', justifyContent: 'center'}}>
                            <p className="center">{value[3] == "269750036"? "100DOF" : ""}  #{value[1]}</p> 
                            <input type="radio" id={value[0]} name="id_to_sell" value={value[0]} style={{marginLeft: '10px', marginTop: '0px', width: '1em', height: '1em'}} onChange={(e) => setNFTToTransfer(e.target.value)}/>
                        </div>
                    </div>
          })
          :NFTIds.map((value, index) => {
            return  <div className="collection-img" key={index}>
                        <a alt={value} href={"imgs/" + value + ".png"}><img src={"imgs/" + value + ".png"}/></a>
                        <div style={{display: 'flex', margin: '5px', padding:'5px', justifyContent: 'center'}}>
                            <p className="center">#{value}</p> 
                            <input type="radio" id={value} name="id_to_sell" value={value} style={{marginLeft: '10px', marginTop: '0px', width: '1em', height: '1em'}} onChange={(e) => setNFTToTransfer(e.target.value)}/>
                        </div>
                    </div>
          })}
          {NFTIds.length == 0 && DOFInfo.length == 0 && user?.loggedIn
           ? <p>Collection empty</p> : <span></span>
          }
          <div></div>
        </div>    
      </div>
      <div>
        <div className="center">
          {user?.loggedIn
            ? <div>       
                <button onClick={logOut}>LOGOUT</button>
              </div>
            : <div>
                <button onClick={fcl.authenticate}>CONNECT</button>
              </div>
          }
        </div>
      </div>
    </div>
  )
}

export default App;
