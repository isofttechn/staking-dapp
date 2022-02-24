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
            4: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            1: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
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
            const stakingContractAddress = '0x704Dd327C104e748D6E7E670061247238348E0DA';
            const TokencontractAddress = '0xD99b4BB049a6Dd490901CDfa33F15C4fAc097EF0';
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
              contract,
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

            if(window.ethereum && window.ethereum.networkVersion !== '4') {
              await addNetwork(4);
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
    if(networkId !== '4') {
      console.log(networkId);
      await store.dispatch(connectFailed('Please switch to Binance mainnet'));
      //alert('Please switch to binance network!')
      addNetwork(4);
    } else {
      store.dispatch(connectWallet());
    }
  });
}

export async function addNetwork(id) {
let networkData;
switch (id) {
  //bsctestnet
  case 4:
    networkData = [
      {
        chainId: "0x4",
      },
    ];

    break;
  //bscmainet
  case 1:
    networkData = [
      {
        chainId: "0x1",
      },
    ];
    break;
  default:
    break;
}
return window.ethereum.request({
  method: "wallet_switchEthereumChain",
  params: networkData,
});
}

(() => {
if(window.ethereum) {
  window.ethereum.on('networkChanged', async function(networkId){
    console.log('network change', networkId);
    if(networkId !== '4') {
      console.log(networkId);
      await store.dispatch(connectFailed('Please switch to Binance mainnet'));
      addNetwork(4);
      //alert('Please switch to binance network!')
    } else {
      store.dispatch(connectWallet());
    }
  });
}
})();
