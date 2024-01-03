import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import './AdminPage.css';

const FetchParkingUsers = () => {
  const [parkingSeeker, setParkingSeeker] = useState([]);

  useEffect(() => {
    const fetchParkingUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'user'));
        const userList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParkingSeeker(userList);
      } catch (error) {
        console.error('Error fetching parking seeker:', error);
        
      }
    };

    fetchParkingUsers();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="sidebar">
        <div className="admin-container">
          <img
            src="customer.jpg"
            alt="Admin"
            className="admin-pic"
            style={{ width: '50px', marginRight: '10px' }}
          />
          <span className="admin-text">Admin</span>
        </div>
        <nav>
          <p>
            <img src="paint.png" alt="Parking Seeker Icon" className="icon" />
            <a href="AdminPage" style={{ color: 'white', textDecoration: 'none' }}>
              Home
            </a>
          </p>
          <p>
            <img src="estb.jpg" alt="Parking Seeker Icon" className="icon" />
            <a href="FetchEstablishments" style={{ color: 'white', textDecoration: 'none' }}>
              Establishment List
            </a>
          </p>
          <p>
            <img src="agent.jpg" alt="Parking Seeker Icon" className="icon" />
            <a href="FetchAgents" style={{ color: 'white', textDecoration: 'none' }}>
              Agents List
            </a>
          </p>
        </nav>
      </div>
      <div className="main-content">
        <div className="header">
          



          
        </div>
        <div className="project-list">
          <h1 className="pending">Parking Seekers Accounts</h1>
          {parkingSeeker.length > 0 ? (
            <ul className="user-list">
              {parkingSeeker.map((seeker, index) => (
                <React.Fragment key={seeker.id}>
                  <li className="user-item">
                    <img
                      src={seeker.profileImageUrl || '/default-avatar.png'}
                      alt={seeker.name}
                      className="user-image"
                    />
                    <div className="user-details">
                      <span className="user-name">{seeker.name}</span>
                      <br />
                      <span className="user-info">
                        Address: {seeker.address} | Email: {seeker.email}
                      </span>
                    </div>
                  </li>
                  {index < parkingSeeker.length - 1 && <hr className="horizontal-line" />}
                </React.Fragment>
              ))}
            </ul>
          ) : (
            <p>No parking seekers found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FetchParkingUsers;