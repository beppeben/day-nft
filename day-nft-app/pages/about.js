import Head from 'next/head'

export default function About() {
  return (
    <div>
      <Head>
        <title>About DAY-NFT</title>
        <meta name="description" content="About DAY-NFT" />
        <link rel="icon" href="/favicon.png" />
        <link href="http://fonts.cdnfonts.com/css/silkscreen" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js" />
        <script src="sketch.js" />
      </Head>
      <div className="container">
        <div className="center-text">
        <p>Day-NFTs are like digital postcards, with added rarity, community and rewards.</p>
        <ul>
          <li>Only one Day-NFT is minted every day to the highest bidder (all the others get refunded).</li>
          <li>It comes with a random artwork which depends on the posted message.</li>        
          <li>50% of all earnings from mints and transfer fees are redistributed back to NFT holders.</li>
          <li>Discord community and marketplace will come soon.</li>
        </ul>
        </div>
      </div>
    </div>
  )
}

