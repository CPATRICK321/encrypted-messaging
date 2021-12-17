import React, { Component } from 'react';

class App extends Component {

  constructor(props){
    super(props);

    this.registerUser = this.registerUser.bind(this);
    this.loginUser = this.loginUser.bind(this);
  
  }

  componentDidMount(){

    const form = document.getElementById('reg-form')
    form.addEventListener('submit', this.registerUser)
  }

  async registerUser(){
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value


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
      alert("Success")
    }else{
      alert(result.error)
    }

    console.log("hi")
  }

  async loginUser(){
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value


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
      console.log('Got the token: ', result.data)
      alert("Success")
    }else{
      alert(result.error)
    }

    console.log("hi")
  }


  render() {
    return (
      <div className="App">
      
      <h1>Welcome</h1>
      <div id="reg-form">
        <input autoComplete="off" type="text" placeholder="username" id="username" ></input>
        <input autoComplete="off" type="password" placeholder="password" id="password" ></input>
        <button type="submit" value="Submit" onClick={this.registerUser}>Register</button> 
        <button type="submit" value="Submit" onClick={this.loginUser}>Login</button> 

      </div>

      <script>
      </script>
    </div>
    );
  }
}

export default App;