import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, web3, AnchorProvider } from '@project-serum/anchor';
import React, { useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import idl from './idl.json'
import kp from './keypair.json'
import { Buffer } from "buffer";
window.Buffer = Buffer;

// SystemProgram é uma referencia ao 'executor' (runtime) da Solana!
const { SystemProgram } = web3;

// Cria um par de chaves para a conta que irá guardar os dados do GIF.
// Obtém o id do nosso programa do arquivo IDL.
const programID = new PublicKey(idl.metadata.address);

// Define nossa rede para devnet.
const network = clusterApiUrl('devnet');

// Controla como queremos 'saber' quando uma transação está 'pronta'.
const opts = {
  preflightCommitment: "processed"
}

// Constantes
const TWITTER_HANDLE = "web3dev_";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const gifs = [
//   'https://i.giphy.com/media/dHsIch1HMkOWrCc73J/200w.webp',
//   'https://i.giphy.com/media/ATGezri9XEaqY/giphy.webp',
//   'https://i.giphy.com/media/xT1XGZndeDLlWvSDaU/giphy.webp'
// ]
  

const App = () => {
  // State
  // State
  const arr = Object.values(kp._keypair.secretKey)
  const secret = new Uint8Array(arr)
  const baseAccount = web3.Keypair.fromSecretKey(secret)
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);
  // Ações
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet encontrada!");
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Conectado com a Chave Pública:",
            response.publicKey.toString()
          );

          /*
           * Define a chave pública do usuário no estado para ser usado posteriormente!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Objeto Solana não encontrado! Instale a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => { 
    const { solana } = window
    if (solana) {     
      const connectResponse = await solana.connect()
      console.log('Carteira conectada com o endereço :',connectResponse.publicKey.toString())
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Conecte sua carteira
    </button>
  );


  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("BaseAccount criado com sucesso com o endereço :", baseAccount.publicKey.toString())
      await getGifList();

    } catch (error) {
      console.log("Erro criando uma nova BaseAccount:", error)
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("Nenhum link de GIF foi dado!");
      return;
    }

    setInputValue("");
    console.log("Link do GIF:", inputValue);

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log(
        "GIF enviado com sucesso para o programa",
        inputValue
      );

      await getGifList();
    } catch (error) {
      console.log("Erro enviando GIF:", error);
    }
  };
  const renderConnectedContainer = () => {
    // Se chegarmos aqui, significa que a conta do programa não foi inicializada.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Fazer inicialização única para conta do programa GIF
          </button>
        </div>
      )
    }
    // Caso contrário, estamos bem! A conta existe. Usuários podem submeter GIFs.
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Entre com o link do GIF!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Enviar
            </button>
          </form>
          <div className="gif-grid">
            {/* Usamos o indice (index) como chave (key), também o 'src' agora é 'item.gifLink' */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt={'gif'}/>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }
  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  
  const getGifList = async() => {
  try {
    const provider = getProvider()
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    
    console.log("Conta obtida", account)
    setGifList(account.gifList)

  } catch (error) {
    console.log("Erro em getGifList: ", error)
    setGifList(null);
  }
}

useEffect(() => {
  if (walletAddress) {
    console.log('Obtendo a lista de GIF...');
    getGifList()
  }
}, [walletAddress]);

  return (
    <div className="App">
      {/* Isso só foi adicionar para um estilozinho */}
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼Meu Portal de GIF</p>
          <p className="sub-text">Veja sua coleção de GIF no metaverso ✨</p>
          {walletAddress && renderConnectedContainer()}
          {!walletAddress && renderNotConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`feito por @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

 export default App;