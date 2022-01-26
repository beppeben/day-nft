import DayNFT from 0xDAYNFTCONTRACTADDRESS

transaction() {

    let address: Address

    prepare(signer: AuthAccount) {
        self.address = signer.address     
    }

    execute { 
        DayNFT.claimTokens(address: self.address)
    }
}