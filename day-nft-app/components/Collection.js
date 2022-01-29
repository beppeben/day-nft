import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";

function App() {
  const [user, setUser] = useState({ loggedIn: null })
  const [NFTIds, setNFTIds] = useState([])
  
  async function onAuthenticate(user) {
    setUser(user)
    if (user?.addr != null) {
      getNFTIds(user.addr);
    } 
  }

  useEffect(() => fcl.currentUser.subscribe(onAuthenticate), [])

  const logOut = async () => {
    const logout = await fcl.unauthenticate()
    setUser(null)
    setNFTIds([])
  }
  
  const getNFTIds = async (address) => {
    const ids = await fcl.query({
      cadence: `
        import DayNFT from 0xDayNFT
        import NonFungibleToken from 0xNonFungibleToken

        pub fun main(account: Address): [UInt64] {
            let collectionRef = getAccount(account)
                .getCapability(DayNFT.CollectionPublicPath)
                .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>()
                ?? panic("Could not get reference to the NFT Collection")

            return collectionRef.getIDs()
        }
      `,
      args: (arg, t) => [arg(address, t.Address)]
    })

    setNFTIds(ids)
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
      <div className="grid">
        <div>
          <WelcomeText />
          {NFTIds.map((value, index) => {
            return <img className="collection-img" src={"imgs/" + index + ".png"}/>
          })}
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
