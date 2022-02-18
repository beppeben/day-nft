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
            <a href="https://github.com/beppeben/day-nft-contracts" target="_blank" rel="noopener noreferrer">GitHub</a>
          </li>
          <li>
            <a href="https://discord.gg/dET3YqabTt" target="_blank" rel="noopener noreferrer">Discord</a>
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
