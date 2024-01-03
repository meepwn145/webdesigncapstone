import React, { useState, useEffect, useContext} from 'react';
import { useLocation } from 'react-router-dom';
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { FaUserCircle } from "react-icons/fa";
import { Link } from 'react-router-dom';
import {
  MDBCol,
  MDBContainer,
  MDBRow,
  MDBCard,
  MDBCardText,
  MDBCardBody,
  MDBCardImage,
  MDBBtn,
  MDBTypography,
} from 'mdb-react-ui-kit';
import UserContext from '../UserContext';
import {auth, db} from "../config/firebase"
import { updateDoc, doc, getDoc} from 'firebase/firestore';
import { storage } from "../config/firebase";
import {ref, uploadBytes, getDownloadURL, listAll, list  } from "firebase/storage"
import {v4} from "uuid"; 


export default function EditButton() {
  const location = useLocation();
  const { user } = useContext(UserContext);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.managementName || ""); 
  const [address, setAddress] = useState(user.companyAddress  || ""); 
  const [companyContact, setCompanyContact] = useState(user.contact || ""); 
  const [companyEmail, setCompanyEmail] = useState(user.email || ""); 
  const [companyName, setCompanyName] = useState (user.management || "");
  const [profileImageUrl, setProfileImageUrl] = useState("");

 const userDocRef = auth.currentUser ? doc(db, 'establishments', auth.currentUser.uid) : null;
  
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  const saveProfileImageUrl = async (url) => {
    if (userDocRef) {
      await updateDoc(userDocRef, {
        profileImageUrl: url,
      });
    }
  };


  useEffect(() => {
    if (userDocRef) {
      const fetchImageUrl = async () => {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfileImageUrl(userData.profileImageUrl);
        } else {
          console.log('No such document!');
        }
      };

      fetchImageUrl().catch(console.error);
    }
  }, [userDocRef]);

  const imagesListRef = ref(storage, "images/");
  const uploadFile = () => {
    if (imageUpload && auth.currentUser) {
      const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
      uploadBytes(imageRef, imageUpload).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          setProfileImageUrl(url); 
          saveProfileImageUrl(url);
        });
      });
    }
  };
  
  useEffect(() => {
    listAll(imagesListRef).then((response) => {
      response.items.forEach((item) => {
        getDownloadURL(item).then((url) => {
          setImageUrls((prev) => [...prev, url]);
        });
      });
    });
  }, []);

 

  useEffect(() => {
    const fetchUserData = async () => {
      try {

        if (auth.currentUser) {
          const userId = auth.currentUser.uid;


          const doc = await db.collection("establishments").doc(userId).get();

          if (doc.exists) {
            const userData = doc.data();
            
            setName(userData.managementName || "");
            setAddress(userData.address || "");
            setCompanyContact(userData.contact || "");
            setCompanyName(userData.managementName || "");
            setCompanyEmail(userData.email || "");
          } else {
            console.log("No user data found!");
          }
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
      }
    };

    fetchUserData();
  }, []); 

  const updateUserData = async () => {
    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const userDocRef = doc(db, 'establishments', userId); 

        const updatedData = {
          managementName: name,
          address: address,
          contact: companyContact,
          email: companyEmail,
        };

        await updateDoc(userDocRef, updatedData);

        console.log("User data updated/created successfully!");
      } else {
        console.error("User not authenticated");
      }
    } catch (error) {
      console.error("Error updating user data: ", error);
    }
};

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = () => {
    console.log(auth.currentUser);
    setIsEditing(false);
    updateUserData();
};
  

  const styles = {
    welcomeMessage: {
      position: "absolute",
      top: "10px",
      right: "10px",
      margin: "0",
      color: "#fff",
      fontFamily: "Rockwell, sans-serif",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
    },
    icon: {
      marginRight: "5px",
    },
  };
  const imageSizeStyles = {
    width: '100%',
    height: '200px', // Set the desired height for all images
    objectFit: 'cover',
    borderRadius: '10px', // Set the desired border radius
  };

  return (
    <section style={{
      backgroundImage: 'url("parkingbackground.jpg")',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      backgroundColor: '#FAEBD7',
    }}>
      <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#003851" }}>
        <div className="container">
          <Link className="navbar-brand" to="/Dashboard">
            SpotWise Parking Management System
          </Link>
          <p style={styles.welcomeMessage}>
          <DropdownButton 
                alignRight
                variant="outline-light"
                title={<FaUserCircle style={styles.icon} />}
                id="dropdown-menu"
              > 
              <Dropdown.Item href="Dashboard"><img
                        src="dashboard.jpg"
                        alt="Operator Dashboard Logo"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Dashboard</Dropdown.Item>
              <Dropdown.Item href="AgentSchedule"><img
                        src="calendar.webp"
                        alt="Agent Schedule"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Agent Schedule </Dropdown.Item> 
                <Dropdown.Item href="AgentRegistration"><img
                        src="registerA.jpg"
                        alt="Agent Register"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Register Ticket Operator</Dropdown.Item> 
              <Dropdown.Item href="TicketInfo"><img
                        src="infoPark.png"
                        alt="Parking Info"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Ticket Information</Dropdown.Item> 
              <Dropdown.Item href="Tracks"><img
                        src="management.jpg"
                        alt="Management Details"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Management Details</Dropdown.Item>    
              <Dropdown.Item href="Feedback"><img
                        src="feedback.jpg"
                        alt="Feedback"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Feedback</Dropdown.Item>    
              <Dropdown.Divider />
                <Dropdown.Item href="/"><img
                        src="logout.png"
                        alt="Operator Logout Logo"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Logout</Dropdown.Item>
              </DropdownButton>
          </p>
        </div>
      </nav>
      <MDBContainer className="py-5 h-100" style={{ backgroundColor: "rgba(47, 79, 79, 0.5)" }}>
        <MDBRow className="justify-content-center align-items-center h-100">
          <MDBCol lg="9" xl="7">
            <MDBCard>
              <div className="rounded-top text-white d-flex flex-row" style={{ height: '150px', position: 'relative' }}>
                <div className="ms-4 mt-5 d-flex flex-column" style={{ width: '200px', position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <MDBCardImage
                    src={profileImageUrl || "defaultt.png"}
                    alt="Profile"
                    className="mt-4 mb-2 img-thumbnail"
                    fluid style={{ width: '150px', zIndex: '1', borderRadius: '50%' }}
                  />
                  {isEditing && (
                    <div className="d-flex align-items-center">
                      <input
                        type="file"
                        onChange={(event) => {
                          setImageUpload(event.target.files[0]);
                        }}
                        style={{ marginBottom: '10px', marginRight: '10px' }}
                      />
                      <MDBBtn outline color="dark" style={{ height: '35px', marginRight: '8px', marginBottom: '10px', overflow: 'visible' }} onClick={uploadFile}>
                        Upload
                      </MDBBtn>
                    </div>
                  )}
                </div>
                <div className="ms-3" style={{ marginTop: '200px', fontFamily: 'Georgina' }}>
  {isEditing ? (
    <>
      <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: '10px' }} />
      <input type="text" placeholder="Location" value={address} onChange={(e) => setAddress(e.target.value)} style={{ marginBottom: '10px' }} />
      <input type="text" placeholder="Email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} style={{ marginBottom: '10px' }} />
      <input type="text" placeholder="Contact Number" value={companyContact} onChange={(e) => setCompanyContact(e.target.value)} />
      <MDBBtn outline color="dark" style={{ height: '36px', marginTop: '20px', marginRight: '50px' , marginLeft: '40px'}} onClick={handleSaveProfile}>
        Save Changes
      </MDBBtn>
    </>
  ) : (
    <>
      {/* Display name, contact, etc. */}
    </>
                  )}
                </div>
              </div>
              <div className="p-4 text-black" style={{ fontFamily: 'Georgina' }}>
  {!isEditing && (
    <MDBBtn color="dark" style={{ height: '36px', overflow: 'visible' }} onClick={toggleEditing}>
      Edit Profile
    </MDBBtn>
  )}
</div>
              <MDBCardBody className="text-black p-4" style={{  fontFamily: 'Georgina' }}>
                <div className="mb-5">
                  {isEditing ? (
                    <div className="p-4">
                
                    </div>
                  ) : (
                    
                    <div className="p-4" style={{ fontFamily: 'Georgina', color: 'black'}}>
                        <hr style={{ marginTop: '5px', marginBottom: '5px', borderColor: '#000000' }} />
  <MDBCardText className="font-italic mb-1">
    <img src="esLogo.png" alt="Establishment User Logo" style={{ width: '20px', marginRight: '10px'}} />
    Username: {name}
  </MDBCardText>
  <MDBCardText className="font-italic mb-1" >
    <img src="esA.png" alt="Establishment Address Logo" style={{ width: '20px', marginRight: '10px' }} />
    Address: {address}
  </MDBCardText>
  <MDBCardText className="font-italic mb-1">
    <img src="ope.jpg" alt="Establishment User Logo" style={{ width: '20px', marginRight: '10px' }} />
    Email: {companyEmail}
  </MDBCardText>
  <MDBCardText className="font-italic mb-1">
    <img src="opcontact.png" alt="Establishment User Logo" style={{ width: '20px', marginRight: '10px' }} />
    Contact: {companyContact}
  </MDBCardText>

</div>

                  )}
                </div>
                <hr style={{ marginTop: '5px', marginBottom: '5px', borderColor: '#000000' }} />

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <MDBCardText className="lead fw-normal mb-0" style={{ fontFamily: 'Georgina', fontSize: '18px' }}>Your Parking Lot,  {name}</MDBCardText>
                </div>
               <MDBRow className="g-2">
      <MDBCol className="mb-2">
        <MDBCardImage
          src="https://static-ph.lamudi.com/static/media/bm9uZS9ub25l/2x2x2x380x244/7e83cd57260dee.jpg"
          alt="image 1"
          style={imageSizeStyles}
          className="rounded-3"
        />
      </MDBCol>
      <MDBCol className="mb-2">
        <MDBCardImage
          src="https://static-ph.lamudi.com/static/media/bm9uZS9ub25l/2x2x5x880x396/54e6e09d3e6e1a.jpg"
          alt="image 1"
          style={imageSizeStyles}
          className="rounded-3"
        />
      </MDBCol>
    </MDBRow>
    <MDBRow className="g-2">
      <MDBCol className="mb-2">
        <MDBCardImage
          src="https://www.apartmentguide.com/blog/wp-content/uploads/2019/10/parking_garage_HERO.jpg"
          alt="image 1"
          style={imageSizeStyles}
          className="rounded-3"
        />
      </MDBCol>
      <MDBCol className="mb-2">
        <MDBCardImage
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_pn4I4ZoKpjQEPxu-qmz_Db7y-jZrbNLFdAWdsG3-GUcCw-XW9SESLsm-VkkNBLy7KFI&usqp=CAU"
          alt="image 1"
          style={imageSizeStyles}
          className="rounded-3"
        />
      </MDBCol>
    </MDBRow>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    
    </section>
  );
}
