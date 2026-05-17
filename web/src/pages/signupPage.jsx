import React from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'


const SignUp = () => {
return (
<div>
   <header>
    <a href="/dashboard">
      <img
        className="max-w-3xs"
        src={logo}
        alt="JEDDSpace Logo"
        style={{ width: '220px' }}
      />
    </a>
  </header>
  <main className="container">
    <section className="form-box">
      <h3>Sign Up</h3>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ width: '50%' }}>
          <label>First Name</label>
          <input type="text" placeholder="Enter First Name" />
        </div>
        <div style={{ width: '50%' }}>
          <label>Last Name</label>
          <input type="text" placeholder="Enter Last Name" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ width: '50%' }}>
          <label>Department</label>
          <select defaultValue="">
            <option disabled value="">Enter Department</option>
            <option value="engineering">Engineering Department</option>
            <option value="administration">Administrative Department</option>
          </select>
        </div>
        <div style={{ width: '50%' }}>
          <label>Position</label>
          <input type="text" placeholder="Enter Position" />
        </div>
      </div>

      <label>Email</label>
      <input type="email" placeholder="Enter Email Address" />

      <label>Username</label>
      <input type="text" placeholder="Enter Username" />

      <label>Password</label>
      <input type="password" placeholder="Enter Password" />

      <label>Confirm Password</label>
      <input type="password" placeholder="Confirm Password" />

      <button className="primary-btn">Register</button>
    </section>
  </main>
</div>
)
}

export default SignUp;