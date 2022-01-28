// constants
import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
//import Fortmatic from "fortmatic";
import contract from "../contracts/staking.json";
import tokenContract from "../contracts/token.json";
import pairContract from "../contracts/pair.json";
import store from './store';


const connectRequest = () => {
  return {
    type: "CONNECTION_REQUEST",
  };
};

export const disconnectRequest = () => {
  return {
    type: "DISCONNECT"
  };
}

export const connectSuccess = (payload) => {
  return {
    type: "CONNECTION_SUCCESS",
    payload: payload,
  };
};

const connectFailed = (payload) => {
  return {
    type: "CONNECTION_FAILED",
    payload: payload,
  };
};

export const updateAccountRequest = (payload) => {
  return {
    type: "UPDATE_ADDRESS",
    payload: payload,
  };
};

const getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          //infuraId: '1225dbb4ccc94c219acf51ef31fa42de'
          rpc: {
            56: "https://bsc-dataseed.binance.org",
            97: "https://data-seed-prebsc-1-s1.binance.org:8545/"
          }
        }
      },

      // fortmatic: {
      //   package: Fortmatic, // required
      //   options: {
      //     key: "pk_test_F3E84010E6D100A9" // required
      //   }
      // }
    }
    return providerOptions;
}

export const connectWallet = () => {
    return async(dispatch) => {
        dispatch(connectRequest());
        try {
            const web3Modal = new Web3Modal({
              cacheProvider: true,
                providerOptions: getProviderOptions() // required
            });
    
            const provider = await web3Modal.connect();
            const stakingContractAddress = '0x57906c93964bB136d84c2bC90E97062016359201';
            const TokencontractAddress = '0xBeAa541c685A3ec61e7E5Ed0749db1c2795b93e4';
            const pairContractAddress = '0xbe9efe8D0eF44036Ca838568787e03b7c3762320';
    
            await subscribeProvider(provider, dispatch);
            
            const web3 = new Web3(provider);

            web3.eth.extend({
              methods: [
                {
                  name: "chainId",
                  call: "eth_chainId",
                  outputFormatter: web3.utils.hexToNumber
                }
              ]
            });
        
            const accounts = await web3.eth.getAccounts();
            const address = accounts[0];
        
            const instance = new web3.eth.Contract(
              contract.output.abi,
              stakingContractAddress
            );
            const tokenInstance = new web3.eth.Contract(
              tokenContract.output.abi,
              TokencontractAddress
            )

            const pairInstance= new web3.eth.Contract(
              pairContract,
              pairContractAddress
            )

            if(window.ethereum && window.ethereum.networkVersion !== '97') {
              await addNetwork(97);
            }
            dispatch(
              connectSuccess({
                  address,
                  web3,
                  staking: instance,
                  token: tokenInstance,
                  pair: pairInstance,
                  provider,
                  connected: true,
                  web3Modal
              })
            );
        } catch (e) {
            dispatch(connectFailed(e));
        }
    }
}

// const updateAccount = async(account) => {
//   return async (dispatch) => {
//     console.log(dispatch);
//   };
// };
export const disconnect = () => {
  return async(dispatch)=> {
    const { web3Modal } = store.getState().walletConnect;
    console.log(web3Modal);
    web3Modal.clearCachedProvider();
    dispatch(disconnectRequest());
  }
}

const subscribeProvider = async(provider) => {
  if (!provider.on) {
    return;
  }

  provider.on('connect', async(id) => {
    console.log(id);
  });

  provider.on("networkChanged", async (networkId) => {
    if(networkId !== '97') {
      console.log(networkId);
      await store.dispatch(connectFailed('Please switch to Binance mainnet'));
      //alert('Please switch to binance network!')
      addNetwork(97);
    } else {
      store.dispatch(connectWallet());
    }
  });
}

export async function addNetwork(id) {
let networkData;
switch (id) {
  //bsctestnet
  case 97:
    networkData = [
      {
        chainId: "0x61",
        chainName: "BSCTESTNET",
        rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
        nativeCurrency: {
          name: "BINANCE COIN",
          symbol: "BNB",
          decimals: 18,
        },
        blockExplorerUrls: ["https://testnet.bscscan.com/"],
      },
    ];

    break;
  //bscmainet
  case 56:
    networkData = [
      {
        chainId: "0x38",
        chainName: "BSCMAINET",
        rpcUrls: ["https://bsc-dataseed1.binance.org"],
        nativeCurrency: {
          name: "BINANCE COIN",
          symbol: "BNB",
          decimals: 18,
        },
        blockExplorerUrls: ["https://testnet.bscscan.com/"],
      },
    ];
    break;
  default:
    break;
}
return window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: networkData,
});
}

(() => {
if(window.ethereum) {
  window.ethereum.on('networkChanged', async function(networkId){
    console.log('network change', networkId);
    if(networkId !== '97') {
      console.log(networkId);
      await store.dispatch(connectFailed('Please switch to Binance mainnet'));
      addNetwork(97);
      //alert('Please switch to binance network!')
    } else {
      store.dispatch(connectWallet());
    }
  });
}
})();
