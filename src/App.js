import React, { Component } from 'react';
import './App.css'


class App extends Component {

  constructor(props){
    super(props);

    this.registerUser = this.registerUser.bind(this);
    this.loginUser = this.loginUser.bind(this);
  
  }

  async registerUser(){
    const username = document.getElementById('Username').value
    const password = document.getElementById('Password').value


    const result = await fetch('http://localhost:3333/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    }).then((res) => res.json())

    if(result.status === 'ok'){
      //success
    }else{
      alert(result.error)
    }

    console.log("hi")
  }

  async loginUser(){
    const username = document.getElementById('Username').value
    const password = document.getElementById('Password').value

    const result = await fetch('http://localhost:3333/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    }).then((res) => res.json())

    if(result.status === 'ok'){
      localStorage.setItem('user', username)
      localStorage.setItem('JWTtoken', result.data)
      window.location.href = "/dashboard";
      console.log('Got the token: ', result.data)
      alert("Success")
    }else{
      alert(result.error)
    }

    console.log("hi")
  }


  // render() {
  //   return (
  //     <div className="App">
      
  //     <h1>Welcome</h1>
  //     <div id="reg-form">
  //       <input autoComplete="off" type="text" placeholder="username" id="username" ></input>
  //       <input autoComplete="off" type="password" placeholder="password" id="password" ></input>
  //       <button type="submit" value="Submit" onClick={this.registerUser}>Register</button> 
  //       <button type="submit" value="Submit" onClick={this.loginUser}>Login</button> 

  //     </div>

  //     <script>
  //     </script>
  //   </div>
  //   );
  // }
  render(){
    return(
      <div className="welcomeWrapper">
        <div className="container">
          <h1>Welcome</h1>
          <div className="form">
            <input className="welcomeInput" autoComplete="off" type="text" placeholder="Username" id="Username"/>
            <input className="welcomeInput" autoComplete="off" type="password" placeholder="Password" id="Password"/>
            <button className="welcomeButton" id="register-button" onClick={this.registerUser}>Register</button>
            <button className="welcomeButton" id="login-button" onClick={this.loginUser}>Login</button>
          </div>
        </div>
      
        <ul className="bg-bubbles">
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      </div>
    )
  }
}

export default App;