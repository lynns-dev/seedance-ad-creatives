import { Hanken_Grotesk } from 'next/font/google';

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

export default function App({ Component, pageProps }) {
  return (
    <div className={hankenGrotesk.className}>
      <Component {...pageProps} />
    </div>
  );
}
