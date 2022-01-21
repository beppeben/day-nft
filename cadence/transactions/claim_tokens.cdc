import DayNFT from 0xDAYNFTCONTRACTADDRESS

// This script uses the NFTMinter resource to mint a new NFT
// It must be run with the account that has the minter resource
// stored in /storage/NFTMinter

transaction() {

    let address: Address

    prepare(signer: AuthAccount) {
        self.address = signer.address     
    }

    execute { 
        DayNFT.claimTokens(address: self.address)
    }
}
 