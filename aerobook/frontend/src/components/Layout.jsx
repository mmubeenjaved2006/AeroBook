import React from 'react';
import {Link,NavLink,useNavigate} from 'react-router-dom';
import {Plane,Menu,LogOut} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
export default function Layout({children}){const {user,logout}=useAuth();
const navigate=useNavigate();
return <>
<header className="topbar">
<Link className="brand" to="/">
<Plane size={26} fill="currentColor"/> Aero<span>Book</span>
</Link>
<nav>
<NavLink to="/">Home</NavLink>
<NavLink to="/flights">Flights</NavLink>
<NavLink to="/bookings">Manage Booking</NavLink>{user?.role==='admin'&&<NavLink to="/admin">Admin</NavLink>}</nav>
<div className="nav-actions">{user?<>
<span className="welcome">Hi, {user.name.split(' ')[0]}</span>
<button className="btn outline small" onClick={async()=>{await logout();
navigate('/')}}>
<LogOut size={15}/> Logout</button>
</>:<>
<Link className="btn outline small" to="/login">Log In</Link>
<Link className="btn gold small" to="/signup">Sign Up</Link>
</>}</div>
</header>
<main>{children}</main>
<footer>
<div className="brand">
<Plane size={21}/> Aero<span>Book</span>
</div>
<p>Discover the world, one journey at a time.</p>
<small>© {new Date().getFullYear()} AeroBook · Demo reservation platform. Not affiliated with any airline.</small>
</footer>
</>}
