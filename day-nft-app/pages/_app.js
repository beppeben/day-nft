import '@picocss/pico'
import '../styles/globals.css'
import Link from 'next/link'
import { ThemeProvider } from 'next-themes'

function MyApp({ Component, pageProps }) {
  return(
  <ThemeProvider defaultTheme="dark">    
    <div>
    <nav className="container header">
      <ul>
        <li>
          <div>
            <Link href="/">
              <a><h2>DAY-NFT.IO</h2></a>
            </Link>
          </div>
          <span className="subHeader"><small>Drinks edition</small></span>
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
            <a href="https://flow-view-source.com/mainnet/account/0x1600b04bf033fb99/contract/DayNFT" target="_blank" rel="noopener noreferrer">Contract</a>
          </li>
          <li>
            <a href="https://discord.gg/cSjwSSxwXf" target="_blank" rel="noopener noreferrer">Discord</a>
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
  </ThemeProvider>)
}

export default MyApp
