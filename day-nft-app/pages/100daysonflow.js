import Head from 'next/head'
import HundredDaysOnFlow from '../components/HundredDaysOnFlow'

export default function Home() {
  return (
    <div>
      <Head>
        <title>DAY-NFT</title>
        <meta name="description" content="Days On Flow minting app" />
        <link rel="icon" href="/thumbnail.png" />
        <link href="https://fonts.cdnfonts.com/css/silkscreen" rel="stylesheet" />
        <meta property="og:image" content="/thumbnail.png" />
      </Head>
      

      <main>
        <div className="grid">
          <HundredDaysOnFlow />
        </div>
      </main>

      

    </div>
  )
}
