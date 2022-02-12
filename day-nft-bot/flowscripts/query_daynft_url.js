const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
const { setEnvironment } = require("flow-cadut");

const queryDayNFTUrl = async (address, date) => {
  await setEnvironment("testnet");
  const url = await fcl.send([
    fcl.script(`
      import DayNFT from 0x0b7f00d13cd033bd

      pub fun main(address: Address, date: String): String? {
        let collectionRef = getAccount(address)
          .getCapability(DayNFT.CollectionPublicPath)
          .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>()
          ?? panic("Could not get reference to the NFT Collection")
        
        var res: String? = nil
        let ids = collectionRef.getIDs()
        for id in ids {
          let nft = collectionRef.borrowDayNFT(id: id)!
          if (nft!.dateStr == date) {
            res = nft!.thumbnail
          }
        }
        return res
      }
    `),
    fcl.args([
      fcl.arg(address, t.Address),
      fcl.arg(date, t.String),
    ])
  ]).then(fcl.decode);

  return url
}

module.exports = {
  queryDayNFTUrl
}
