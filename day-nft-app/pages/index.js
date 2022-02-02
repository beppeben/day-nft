import Head from 'next/head'
import Auth from '../components/Auth'
import Script from 'next/script'

export default function Home() {
  return (
    <div>
      <Head>
        <title>DAY-NFT</title>
        <meta name="description" content="DAY-NFT minting app" />
        <link rel="icon" href="/favicon.png" />
        <link href="http://fonts.cdnfonts.com/css/silkscreen" rel="stylesheet" />
        <meta property="og:image" content="http://test.day-nft.io/thumbnail.png" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js" />
        <script src="sketch.js" />
        <script src="functions.js" />
      </Head>
      

      <main>
        <div className="grid">
          <Auth />
        </div>
      </main>

      

    </div>
  )
}
