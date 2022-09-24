import Head from 'next/head'
import Auth from '../components/Auth'
import Script from 'next/script'

export default function Home() {
  return (
    <div>
      <Head>
        <title>DAY-NFT</title>
        <meta name="description" content="DAY-NFT minting app" />
        <link rel="icon" href="/thumbnail.png" />
        <link href="https://fonts.cdnfonts.com/css/silkscreen" rel="stylesheet" />
        <meta property="og:image" content="/thumbnail.png" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js" />
        <script src="sketch_drinks.js" />
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
