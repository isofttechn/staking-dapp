import React, { Component } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Carousel from "react-bootstrap/Carousel";
import "./scss/home.css";
import "./scss/swap.css";
import "rc-slider/assets/index.css";
import Slider, { SliderTooltip } from "rc-slider";
import { connect } from "react-redux";
import { connectWallet } from '../../redux/WalletAction';
import bnb from "../../assets/eth.png";
import transfer from "../../assets/transfer.png";
import buyLoader from "../../assets/doxa-ico-loader.gif";

import miniLogo from "../../assets/logo.png";
import stakingLogo from "../../assets/staking.png";
import claimImg from "../../assets/send.png";
import axios from 'axios';

export class Home extends Component {
  constructor() {
    super();
    this.state = {
      hideApprove:false,
      stakeValue: 1000,
      yearsValue: 10,
      currindex: 0,
      stakeRecords: [],
      isApproved: false,
      allowance: 0,
      rewardUsdtValue: 0,
      stakeUsdtValue: 0,
      inputValue: '0',
      doxaValue: 0,
      stakeType: false,
      stakeloading:false,
      walletBalance: 0,
      metaBalance: 0,
      price: 0,
      //priceFn: this.getPrice(),
      arrData: [
        {
          title: "Earn rewards",
          desc: "Enjoy rewarding APR models to earn by simply staking your AZO tokens for a specific period of time. Whether its 3 days or 3 months. You're rewarded",
        },
        {
          title: "Cash out your rewards",
          desc: "With the AZO staking platform you can cash out your staking rewards although your principal is locked. So you can enjoy rewards all year round without compromising on your initial amount!",
        },
        {
          title: "Earn up to 100% APR",
          desc: "When you choose to stake your AZO tokens through a lockup period, You can earn up to 100% APR rewards on all your staking investment. How good is that!",
        },
        {
          title: "Choose what suits you",
          desc: "We understand everyone has different comfort zones, That's why we've provided you the option to lockup your tokens for a period that suits you! Use the slider to determine how many days you would like to lockup your tokens for crazy returns!",
        },
      ],
      currentAPR: 0,
      currentestimatedreward:0,
      showDiv: false
    };
  }
  async componentDidMount() {
    let currentAPR = this.calculateAPR(this.state.yearsValue);
    this.setState({ currentAPR });

    this.getPrice();

    const { web3Modal, web3 } = this.props.wallet
    if (web3Modal.cachedProvider) {
      this.props.connectWallet().then(async() => {
        if(this.props.wallet.connected !== false) {

          await this.getStakeRecords();
          await this.checkAllowance();
          await this.getTokenBalance();
        }
      });
    }
  }


  getPrice = async() => {

    const res = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=lockness&vs_currencies=usd", {
      headers : {
        'X-CMC_PRO_API_KEY': '8fe399f1-2f42-47de-81b5-c2ed4296baf7',
        'Accepts': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

    const price = res.data.lockness.usd;
    this.setState({price}, () => this.calculateReward(this.state.stakeValue));
 
  }

  buyToken = async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get('email');
    let inputValue = parseFloat(this.state.inputValue);
    if (inputValue >= 0.00001 && inputValue <= 10) {
      const { web3, doxa, wallet, address } = this.props.wallet;
      const value = this.state.inputValue.toString();
      const buyValue = web3.utils.toWei(value, 'ether');
      const tokenPrice = web3.utils.toWei('0.00001', 'ether');
      const totalTokens = (web3.utils.toBN(buyValue).div(web3.utils.toBN(tokenPrice))).toString();
      // console.log(totalTokens);

      try {
        this.setState({ loading: true })

        const res = await wallet.methods.swapEthToDoxa('email').send({ from: address, value: buyValue });

        // console.log(res);
        this.setState({ loading: false })

      } catch (err) {
        this.setState({ loading: false })

        if (err.message) {
          alert(err.message)
        } else {
          alert("Something went wrong!")
        }
      }
    } else {
      alert("ETH should be between 0.00001 and 10");
      return
    }
    }

  async componentDidUpdate(prevProps, prevState) {
    const {web3} = this.props.wallet;
    if(prevProps.wallet.connected !== this.props.wallet.connected ) {
      this.getStakeRecords();
    }
  }

  updateInputValue = async (e) => {
    // const {web3} = this.props.wallet;
    // const BN = web3.utils.BN;
    let totalTokens;
    if (e.target.value != '') {
      totalTokens = parseFloat(e.target.value) / 0.00001;
    }
    this.setState({
      inputValue: e.target.value,
      doxaValue: totalTokens
    });
  }
  
  checkAllowance = async() => {
    const {web3, token, address} = this.props.wallet;
    const stakingContractAddress = process.env.REACT_APP_DOXACONTRACT_ADDRESS;
    const allowance = await token.methods.allowance(address, stakingContractAddress).call();
    const allowanceFromWei = parseInt(web3.utils.fromWei(allowance, 'ether'));
    this.setState({allowance: allowanceFromWei}, () => {
      if(this.state.allowance < this.state.stakeValue) {
        this.setState({isApproved: false});
      } else {
        this.setState({isApproved: true});
      }
    });
  }

  getTokenBalance = async() => {
    const {web3, address, token, wallet} = this.props.wallet;
    const balance = web3.utils.fromWei(await wallet.methods.walletBalanceOf(address).call(), 'ether');
    this.setState({walletBalance: parseFloat(balance).toFixed(2)})
    const balanceMeta = web3.utils.fromWei(await token.methods.balanceOf(address).call(), 'ether');
    this.setState({metaBalance: parseFloat(balanceMeta).toFixed(2)});
  }

  getStakeRecords = async() => {
    const {web3, staking, address} = this.props.wallet;
    const totalStakeRecord = await staking.methods.totalStakeRecords(address).call();
    const stakersPromises = [];
    for(let i = 0; i < totalStakeRecord; i++) {
      stakersPromises.push(staking.methods.Stakers(address, i).call());
    }

    Promise.all(stakersPromises).then(async(res) => {
      await Promise.all(res.map(async(data, i) => {
        data.balance = web3.utils.fromWei(data.balance, 'ether');
        let earned = await staking.methods.earned(address, i).call();
        data.rewardEarned = web3.utils.fromWei(earned, 'ether').split('.')[0];
        data.apr = this.calculateAPR(parseInt(data.lockingPeriod));

        const time = Math.floor(Math.floor(data.maxTime - (Date.now() / 1000)) / (60));
        data.timeleft = time < -1 ? -1 : time;
   
      }));
      if(res.length > 0) {
        this.setState({stakeRecords: res});
      }
    });
  }

  connectToWallet = async () => {
    await this.props.connectWallet();
  }

  stakeAZO = async () => {
    this.setState({stakeloading:true})
    let type;
    if(this.state.stakeType) {
      type = 1;
    } else type = 0;

    if(this.state.stakeValue > 0 && this.state.yearsValue > 0) {
      const {web3, staking, token, address} = this.props.wallet;
      const tokenAmount = web3.utils.toWei(this.state.stakeValue.toString(), 'ether');
      var time = Date.now()
     // console.log("address",[address,process.env.REACT_APP_DOXACONTRACT_ADDRESS,tokenAmount,type,this.state.yearsValue,time])
      const requestOptions = {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
          "Accept":"application/json" 
        },
        body:JSON.stringify({  
          userAddress:address,
          contractAddress:process.env.REACT_APP_DOXACONTRACT_ADDRESS,
          amount:tokenAmount,
          id:type,
          noOfDays:this.state.yearsValue,
          timestamp:time,
        })
      };
      const response1= await fetch(process.env.REACT_APP_API_URL+'/getsignature', requestOptions)
      const data1 = await response1.json();
      var signaturelkn= data1.result
      var sigtuplelkn =[address,process.env.REACT_APP_DOXACONTRACT_ADDRESS,tokenAmount,type,this.state.yearsValue,time,signaturelkn]
      try{
        const stake = await staking.methods.stake(tokenAmount, this.state.yearsValue, sigtuplelkn).send({from:address});
        this.setState({stakeloading:false})
      }catch(err){
        console.log(err)
        this.setState({stakeloading:false})
      }
      // console.log(stake);
      this.getStakeRecords();
      if(this.state.stakeType) {
        this.getTokenBalance();
        this.setState({stakeloading:false})
      }

    } else {
      this.setState({stakeloading:false})
      alert('Amount of AZO or days should be more than 0!')
    }
    
  }

  approval = async () => {
    const {web3, token, address} = this.props.wallet;
    const tokenAmount = web3.utils.toWei('99999999', 'ether');
    const stakingContractAddress = process.env.REACT_APP_DOXACONTRACT_ADDRESS;
    const approval = await token.methods.approve(stakingContractAddress, tokenAmount).send({from: address});
    // console.log(approval);
    this.setState({isApproved: true});
    await this.checkAllowance();
  }

  claimReward = async (record,data) => {
    //console.log("data",data)
        const { web3, staking, address } = this.props.wallet;
        var time=  Date.now()
    try{
      const requestOptions = {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
          "Accept":"application/json" 
        },
        body:JSON.stringify({  
          userAddress:address,
          contractAddress:process.env.REACT_APP_DOXACONTRACT_ADDRESS,
          amount:data.balance,
          id:data.id,
          noOfDays:data.lockingPeriod,
          timestamp:time,
        })
      };
      const response1= await fetch(process.env.REACT_APP_API_URL+'/getsignature', requestOptions)
      const data1 = await response1.json();
      var signaturelkn= data1.result
      var sigtuplelkn =[address,process.env.REACT_APP_DOXACONTRACT_ADDRESS,data.balance,data.id,data.lockingPeriod,time,signaturelkn]
   //   console.log("sigtuplelkn",sigtuplelkn)
      if(await this.isTimeEnded(record)) {
        try{ 
          const exit = await staking.methods.exit(record,sigtuplelkn).send({from: address});
          console.log(exit)
        }catch(err){
        console.log("ERROR: ",err)
        }
       
      }
      else {
        console.log("getReward")
      try{ 
         const claimReward = await staking.methods.getReward(record,sigtuplelkn).send({from: address});
        console.log(claimReward)
      }
        catch(err){
          console.log("Error:",err)
        }
      }
     // console.log("signaturelkn",signaturelkn)
    }catch(err){
      console.log(err)
    }
    this.getStakeRecords();
    this.getTokenBalance();
  }

  unstake = async(record,data) => {
    console.log("data",data)
    const { web3, staking, address } = this.props.wallet;
    var time =Date.now()
    try{
      const requestOptions = {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
          "Accept":"application/json" 
        },
        body:JSON.stringify({  
          userAddress:address,
          contractAddress:process.env.REACT_APP_DOXACONTRACT_ADDRESS,
          amount:data.balance,
          id:data.id,
          noOfDays:data.lockingPeriod,
          timestamp:time,
        })
      };
      const response1= await fetch(process.env.REACT_APP_API_URL+'/getsignature', requestOptions)
      const data1 = await response1.json();
      var signaturelkn= data1.result
      var sigtuplelkn =[address,process.env.REACT_APP_DOXACONTRACT_ADDRESS,data.balance,data.id,data.lockingPeriod,time,signaturelkn]
      if(await this.isTimeEnded(record)) {
        const exit = await staking.methods.exit(record,sigtuplelkn).send({from: address});
      } else {
     //   console.log("sigtuplelkn",sigtuplelkn)
        try{
          const unstake = await staking.methods.unstake(record,sigtuplelkn).send({from: address});
            // console.log(unstake);
        }catch(err){
          console.log("Error:",err)
        }
      }
    }catch(err){
console.log(err)
    }
    
    this.getStakeRecords();
    this.getTokenBalance();
  }

  canUnstake = (data) => {
   
    return !(data.maxTime < (Date.now()/1000));
  }

  isTimeEnded = async(record) => {
    const {web3, staking, address} = this.props.wallet;
    const stakerDetails = await staking.methods.Stakers(address, record).call();

    
    if(parseInt(stakerDetails.maxTime) <= Math.ceil(Date.now() / 1000)) {
      return true;
    }
    return false;
  }

  calculateAPR = (days) => {
    let currentAPR = (days * days * 0.0005) + 50;
    currentAPR = currentAPR.toFixed(3);
    return currentAPR;
  }

  calculateReward = (amount) => {
    amount = (amount * this.state.currentAPR)/100;
    let currentestimatedreward = ((amount / 365) * this.state.yearsValue);
    currentestimatedreward = Math.floor(currentestimatedreward);
    this.setState({ currentestimatedreward: currentestimatedreward }, () => {
      this.setState({rewardUsdtValue: (this.state.currentestimatedreward * this.state.price).toFixed(2)});
    });

    this.setState({stakeUsdtValue: (amount * this.state.price).toFixed(2)});
  }

  handleSelect = (e) => {
    this.setState({ currindex: e });
  };
  
  render() {
    return (
      <div style={{backgroundColor:"#F5D393"}}>
        <Container fluid className="mainCont">
          <Row>
            <Col xl={6} lg={6} md={6} xs={12} className="lhs">
              {/* <h1>AZO STAKING</h1> */}
              <h2>Stake on AZO</h2>
              <p>
                Earn rewards by staking your AZO to help secure the network. Choose your staking preference and start earning profit with just a few clicks!
              </p>
              <button className="btn-btn" onClick={()=>{this.setState({showDiv: !this.state.showDiv})}}>SWAP</button>
              {
                this.state.showDiv ?
                <>
                {/* swap */}
                
                <div className="bs-container h-75">
                <div className="bs-main1">
                  <div className="gapbalance">
                     <b className="balancebold"> {this.state.walletBalance} AZO</b><br />
                       <p className="pbalance"> Available Balance </p>
                  </div>
                </div>
                <div className="bs-main">
                  <h2>swap your crypto</h2>
                  <div className="bs-input">
                    <div className="inpt-cont center mb-3">
                      <label>Enter ETH</label>
                      <input type="number" value={this.state.inputValue} onChange={e => this.updateInputValue(e)} />
                    </div>
                    <div className="img-cont">
                      <img src={bnb} alt="bnb" />
                      <p>ETH</p>
                    </div>
                  </div>
                  {/* image */}
                  <img src={transfer} className="transfer" alt="transfer" />
                  <div className="bs-input">
                    <div className="inpt-cont center">
                      <p>{this.state.doxaValue}</p>
                    </div>
                    <div className="img-cont">
                      <img src={miniLogo} alt="bnb" />
                      <p>DOXAZO</p>
                    </div>
                  </div>
                  {/* btn */}
                  <button className="bs-btn" disabled={this.state.loading} onClick={() => this.props.wallet.connected ? this.buyToken() : this.connectToWallet()}>{this.props.wallet.connected ? this.state.loading ? 
                    <span>Processing <img src={buyLoader}></img></span>
                  : 'Buy' : 'PROCEED TO SWAP'}</button>
                </div>
                </div>
                

                {/* swap end */}
                </>
                :
                <>
                <div className="mtop-10">
                  <div className="gridMain deskCont">
                    {this.state.arrData.map((data) => (
                      <div className="gridCont">
                        <h3>{data.title}</h3>
                        <p>{data.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mobCont">
                  <div className="numberCont">
                    {this.state.arrData.map((data, index) => (
                      <p
                        style={{
                          backgroundColor:
                            this.state.currindex === index
                              ? "#002365"
                              : "#e2e2e2",
                          color:
                            this.state.currindex === index ? "#fff" : "#2b2b2b",
                        }}
                      >
                        {index + 1}
                      </p>
                    ))}
                  </div>
                  <Carousel
                    activeIndex={this.state.currindex}
                    onSelect={(e) => this.handleSelect(e)}
                    variant="dark"
                    controls={false}
                  >
                    {this.state.arrData.map((data) => (
                      <Carousel.Item>
                        <div className="mobSlideCont">
                          <h3>{data.title}</h3>
                          <p>{data.desc}</p>
                        </div>
                      </Carousel.Item>
                    ))}
                  </Carousel>
                </div>
                </>
              }
            </Col>
            <Col xl={6} lg={6} md={6} xs={12} className="rhs">
              <h6 className="text-center">AZO BOUNTY</h6>
              <Row className="stackMain" style={{backgroundColor:"#ffffff"}}>
              
                <Col md={12} className="stackingCont">
                  { 
                  this.state.stakeRecords.length !=0 ?
                  this.state.stakeRecords.map((data, i) => {
                    if(data.balance != '0') {
                      return (
                        <div className="grid-row " >
                          <div style={{flexDirection:"column"}}>
                            <p style={{float:"left"}}>{data.balance} AZO at <b>{data.apr}% APR </b> for <span>{data.lockingPeriod} days</span>({data.timeleft + 1} left)</p> <br></br> 
                            <button  className="grid-btn" style={{float:"left",backgroundColor: !this.canUnstake(data)  ? '#002365' : '#e2e2e2'}} disabled={this.canUnstake(data)} onClick={() => this.unstake(i,data)}>unstake</button>
                          </div>
                          <div style={{flexDirection:"column"}}>
                            <p style={{float:"left"}}>Reward :<b>{data.rewardEarned}</b> AZO </p> <br></br>
                            <button style={{float:"left"}}className="grid-btn" onClick={() => this.claimReward(i,data)}>claim</button>
                          </div>
                        </div>
                      )
                    }
                  })
                  :
                    <div>
                      <p className="emptybounty"> start staking to list your rewards here! </p>
                      </div>
                
                  }
                </Col>

                <Col md={12} className="mobStackCont">
           
                  { 
                  this.state.stakeRecords.length !=0 ? 
                  this.state.stakeRecords.map((data, i) => {
                    if(data.balance !== '0') {
                    return (
                      <div className="d-flex align-items-center  py-3 mobRow">
                      <div style={{flexDirection:"column"}}>   
                        <p style={{float:"left"}}>{data.balance} AZO at <b>{data.apr}% APR </b> <br></br>for <span>{data.lockingPeriod} days</span>({data.timeleft + 1} left)</p>
                        <p style={{float:"left"}}>Reward :<b>{data.rewardEarned}</b> AZO </p>
                      </div> 
                      <div style={{flexDirection:"column",marginTop:"20px"}}>   
                        <button className="grid-btn" style={{float:"left",backgroundColor: !this.canUnstake(data)  ? '#002365' : '#e2e2e2'}} disabled={this.canUnstake(data)} onClick={() => this.unstake(i,data)}>unstake</button>
                        <button style={{float:"left"}}className="grid-btn" onClick={() => this.claimReward(i,data)}>claim</button>
                      </div> 
                      </div>
                 
                    )
                  }
               
                  })
                  :
                    <div>
                      <p className="emptybounty"> start staking to list your rewards here! </p>
                      </div>
                
                  }
                </Col>
              </Row>
              <Row>
                <div className="estimateMain" style={{backgroundColor:"#ffffff"}}>
                  <div className="estimateCont" >
                    <span className="title">Select your rewards</span>
                    <div className="inputCont ">
                      <div className="labelCont d-flex align-items-center" style={{flexDirection:"row"}}>
                        <p>You Stake</p>
                        <input
                          type="number"
                          value={this.state.stakeValue}
                          onChange={(e) => {
                            let value = e.target.value;
                            if(value === '') {
                              value = 0
                            } 
                            this.setState({ stakeValue: value }, () => {
                              //this.setState({ stakeUsdtValue: (this.state.stakeValue/this.state.price)})
                              this.calculateReward(value);
                              if(this.state.stakeValue > this.state.allowance) {
                                this.setState({isApproved: false});
                              }  else {
                                this.setState({isApproved: true});
                              }
                            });
                            this.setState({yearsValue : this.state.yearsValue});
                            
                          }}
                        />
                        
                        <span>AZO</span> &nbsp;&nbsp;
                        
                        <p>{this.state.stakeUsdtValue == 'Infinity' ? '' : this.state.stakeUsdtValue}</p>&nbsp;&nbsp;
                        <span>USD</span>     
                         
                        
                      </div>
                      <Slider
                        min={0} 
                        max={25000000}
                        value={this.state.stakeValue}
                        marks={{
                          0: "0",
                          25000000: "25M",
                        }}

                        onChange={(e) => {
                          this.setState({ stakeValue: e }, () => {
                            this.calculateReward(e);
                            if(this.state.stakeValue > this.state.allowance) {
                              this.setState({isApproved: false});
                            } else {
                              this.setState({isApproved: true});
                            }
                          });
                          this.setState({yearsValue : this.state.yearsValue}, () => this.calculateReward(e));
                        }}

                      />
                    </div>
                    <div className="inputCont">
                      <div className="labelCont d-flex align-items-center">
                        <p>Locking it for</p>
                        <input
                          type="number"
                          value={this.state.yearsValue}
                          onChange={(e) => {
                            if(Number(e.target.value)<366){
                            this.setState({ yearsValue: e.target.value }, () => this.calculateReward(this.state.stakeValue));
                            let currentAPR = this.calculateAPR(e.target.value)
                            this.setState({ currentAPR }, this.calculateReward(this.state.stakeValue));
                            }
                          }}
                        />
                        <span>days</span>
                      </div>
                      <Slider
                        min={0}
                        max={365}
                        value={this.state.yearsValue}
                        marks={{
                          0: "Min lock",
                          365: "Max lock",
                        }}
                        onChange={(e) => {
                          this.setState({ yearsValue: e }, () => this.calculateReward(this.state.stakeValue));
                          let currentAPR = this.calculateAPR(e);
                          this.setState({currentAPR});
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="d-flex justify-content-between align-itens-center py-3 px-5 bottomCont">
                      <div>
                        <p>Your estimated rewards</p>
                        <p>
                          <b>{this.state.currentestimatedreward}AZO </b> &nbsp;&nbsp; {this.state.rewardUsdtValue == 'Infinity' ? '' : this.state.rewardUsdtValue} USD
                        </p>
                      </div>
                      <div>
                        <p style={{ textAlign: "right" }}>Current APR</p>
                        <p style={{ textAlign: "right" }}>
                          <b>{this.state.currentAPR}%</b>
                        </p>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-3 px-5 bottomCont">
                      
                        <input type="radio"  name="btnradio" id="btnradio1" autoComplete="off" checked={this.state.stakeType === true} onChange={() => this.setState({stakeType: true})}/>
                        <label  htmlFor="btnradio1">Internal Wallet <br /> {this.state.walletBalance} AZO</label>

                        <input type="radio" name="btnradio" id="btnradio2" autoComplete="off" checked={this.state.stakeType === false} onChange={() => this.setState({stakeType: false})}/>
                        <label  htmlFor="btnradio2">External Wallet <br /> {this.state.metaBalance} AZO</label>

                    </div>

                    <div className="d-block d-md-flex bottom-btn-cont">
                      {!this.state.isApproved && <button className="btn-btn stake-btn"  onClick={() => this.props.wallet.connected ? this.approval() : alert('Connect to wallet!')}>Approve AZO</button>}
                      <button className="btn-btn stake-btn" style={{backgroundColor:this.state.isApproved ? '#002365' : '#e2e2e2'}} disabled={!this.state.isApproved} onClick={() => this.state.isApproved ? this.stakeAZO(): alert('Approve tokens before staking!')}>STAKE AZO {this.state.stakeloading?<img style={{width:'20px',height:'20px'}} src={buyLoader}></img>:null}</button>
                    </div>
                  </div>
                </div>
              </Row>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  wallet: state.walletConnect
});


export default connect(mapStateToProps, { connectWallet })(Home);

