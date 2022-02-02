import '@picocss/pico'
import '../styles/globals.css'
import Link from 'next/link'

function MyApp({ Component, pageProps }) {
  return <div>
    <nav className="container header">
      <ul>
        <li>
          <Link href="/">
            <a><h2>DAY-NFT.IO</h2></a>
          </Link>
        </li>
      </ul>
      <ul>
        <li>
          <Link href="/collection">
            <a>Collection</a>
          </Link>
        </li>
      </ul>
    </nav>
    <main className="container">
      <Component {...pageProps} />
    </main>
    <footer className="container">
      <nav className="container header center">
        <ul>
          <li>
            <Link href="https://github.com/beppeben/day-nft">
              <a>GitHub</a>
            </Link>
          </li>
          <li>
            <Link href="/about">
              <a>About</a>
            </Link>
          </li>
        </ul>
      </nav>
    </footer>
  </div>
}

export default MyApp
