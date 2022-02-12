const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
const { setEnvironment } = require("flow-cadut");

const checkEmeraldIdentityDiscord = async (discordID) => {
    await setEnvironment("mainnet");
    const accountResponse = await fcl.send([
        fcl.script`
      import EmeraldIdentity from 0x39e42c67cc851cfb

      pub fun main(discordID: String): Address? {
        return EmeraldIdentity.getAccountFromDiscord(discordID: discordID)
      }
      `,
        fcl.args([
            fcl.arg(discordID, t.String)
        ])
    ]).then(fcl.decode);

    return accountResponse;
}


module.exports = {
    checkEmeraldIdentityDiscord
}
