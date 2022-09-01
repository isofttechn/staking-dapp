import React, { Component } from "react";
import { Col, Container, Row } from "react-bootstrap";
import headerLogo from "../../assets/doxa.png";
import headerMobLogo from "../../assets/doxa.png";
import menu from "../../assets/menu.png";
import profileIcon from "../../assets/profile.png";

import "./scss/main.css";
import { useState } from "react";
import { useEffect } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { disconnect, connectWallet } from "../../redux/WalletAction";
import { Home } from "../Home";

function Header() {
  const [openMenu, setopenMenu] = useState(false);
  const [walletName, setwalletName] = useState("");

  const wallet = useSelector((state) => state);
  const dispatch = useDispatch();
  console.log(wallet.walletConnect);

  const disconnectWallet = async () => {
    dispatch(disconnect());
    window.location.reload();
  };

  const connect = async () => {
    console.log("in connect");
    const { web3Modal } = wallet.walletConnect;
    dispatch(connectWallet());
  };
  useEffect(() => {
    if (wallet.walletConnect.web3 !== null) {
      let address = wallet.walletConnect.address;
      address = address.slice(0, 4) + "..." + address.slice(-4);
      setwalletName(address);
    }
  }, [wallet]);

  return (
    <div className="h-100">
      {/* header */}
      <Container fluid className="header-container">
        <Row className="h-100 row-h">
          <Col xl={6} md={6} xs={6} className="p-0 logo-container">
            <a to="/">
              <img src={headerLogo} className="header-logo desLogo" />
              <img
                src={headerMobLogo}
                className="header-logo mobLogo"
                style={{ height: "40px" }}
              />
            </a>
          </Col>

          {/* nav */}
          <Col xl={6} md={6} xs={6} className="p-0">
            <div className="nav">
              <div className="d-flex lk-header" style={{ marginLeft: "auto" }}>
                {/* <button
                  className="btn-btn"
                  style={{ margin: "5px", color: "white" }}
                >
                  How to Buy & Stake
                </button> */}

                <span>{wallet.walletConnect.connected ? walletName : ""}</span>
                <button
                  className="btn-btn stake-btn"
                  style={{ margin: "5px", color: "white" }}
                  onClick={
                    wallet.walletConnect.connected ? disconnectWallet : connect
                  }
                >
                  {wallet.walletConnect.connected
                    ? "Disconnect"
                    : "Connect to wallet"}
                </button>
              </div>

              {/* <a
                className="d-flex"
                to="/home/account"
                onClick={(e) => {
                  e.preventDefault();
                  setopenMenu(!openMenu);
                }}
                style={{ marginLeft: "auto" }}
              >
                <img src={profileIcon} alt="profile" className="prof desLogo" />
                <img src={menu} alt="profile" className="prof mobLogo" /> */}
              {/* </a> */}
              {/* menu link */}
              {openMenu && (
                <div className="menu-dropdown">
                  <a
                    to="/home/account"
                    onClick={() => {
                      setopenMenu(false);
                    }}
                  >
                    {wallet.walletConnect.web3
                      ? wallet.walletConnect.address
                      : ""}
                  </a>

                  {wallet.walletConnect.web3 ? (
                    <a
                      to="/"
                      onClick={(e) => {
                        e.preventDefault();
                        setopenMenu(false);
                        disconnectWallet();
                      }}
                    >
                      Logout
                    </a>
                  ) : (
                    ""
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>
        {/* <br />
        <Row>
          <Col xl={6} md={8} xs={8}>
            <div className="nav">
              <div className="d-flex lk-header" style={{ marginLeft: "auto" }}>
                <button
                  className="btn-btn stake-btn"
                  style={{ margin: "5px", color: "white" }}
                >
                  {" "}
                  How to Buy & Stake
                </button>
              </div>
            </div>
          </Col>
        </Row> */}
      </Container>
    </div>
  );
}

export default Header;
