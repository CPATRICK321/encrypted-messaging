import React, { Component } from 'react';

class Dashboard extends Component {

    constructor(props){
        super(props);
    
        this.logout = this.logout.bind(this);
    }

    logout(){
        localStorage.clear();
        window.location.href = "/welcome";
    }

    render() {
        return (
            <div>
                <button onClick={this.logout}>
                    Logout
                </button>
                YO welcome to the dashboard 
                {" " + localStorage.getItem('user')}
            </div>
        );
    }
}

export default Dashboard;