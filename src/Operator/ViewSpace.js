import React, { useState, useEffect, useContext, useMemo} from 'react';
import { Button, Modal, Form} from 'react-bootstrap';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import { Link, } from 'react-router-dom';
import { FaUserCircle } from "react-icons/fa";
import { db } from "../config/firebase";
import { collection, getDocs, query, where, serverTimestamp,addDoc, setDoc, doc, getDoc, onSnapshot, deleteDoc} from 'firebase/firestore';
import SearchForm from './SearchForm';
import UserContext from '../UserContext';
import { useNavigate } from 'react-router-dom';
import './space.css';


const ParkingSlot = () => {
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
      const { user } = useContext(UserContext);
  const maxZones = 5;
  const initialSlotSets = [{ title: 'Zone 1', slots: Array(15).fill(false) }];
  
  const initialTotalSpaces = initialSlotSets.map(zone => zone.slots.length).reduce((total, spaces) => total + spaces, 0);

  const [slotSets, setSlotSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const totalParkingSpaces = slotSets.reduce((total, slotSet) => total + slotSet.slots.length, 0);
const availableParkingSpaces = slotSets.reduce((available, slotSet) => {
  return available + slotSet.slots.filter(slot => !slot.occupied).length;
}, 0);

const saveSlotsToLocalStorage = (managementName, slots) => {
  try {
    localStorage.setItem(`slotSets_${managementName}`, JSON.stringify(slots));
    console.log('Saved slots to local storage for:', managementName);
  } catch (error) {
    console.error('Error saving slots to local storage:', error);
  }
};

const loadSlotsFromLocalStorage = (managementName) => {
  try {
    const savedSlots = localStorage.getItem(`slotSets_${managementName}`);
    return savedSlots ? JSON.parse(savedSlots) : [];
  } catch (error) {
    console.error('Error loading slots from local storage:', error);
    return [];
  }
};


useEffect(() => {
  let fetchedSlotData = new Map();
  let fetchedResData = new Map();

  // Fetch slot data
  const fetchSlotData = async () => {
    const slotDataQuery = query(collection(db, 'slot', user.managementName, 'slotData'));
    const slotDataSnapshot = await getDocs(slotDataQuery);
    slotDataSnapshot.forEach((doc) => {
      fetchedSlotData.set(doc.id, { ...doc.data(), occupied: doc.data().status === 'Occupied' });
    });
  };

  // Fetch reservation data
  const fetchResData = async () => {
    const resDataQuery = query(collection(db, 'res', user.managementName, 'resData'));
    const resDataSnapshot = await getDocs(resDataQuery);
    resDataSnapshot.forEach((doc) => {
      const resData = doc.data();
     
      fetchedResData.set(resData.slotId, {
        ...resData,
        occupied: true,
        plateNumber: resData.userDetails.plateNumber 
      });
    });
  };

 
  const updateSlots = () => {
    setSlotSets(currentSlotSets =>
      currentSlotSets.map(slotSet => {
       
        const floorOrZone = slotSet.title.replace(/\s+/g, '_'); 
        return {
          ...slotSet,
          slots: slotSet.slots.map((slot, index) => {
            
            const slotId1 = `slot_${slotSet.title}_${index}`;
            const slotId = floorOrZone === 'General_Parking'
              ? `General Parking_${index + 1}` 
              : `${floorOrZone}_${slot.slotNumber || index  + 3}`; 
            const slotData = fetchedSlotData.get(slotId1);
            const resData = fetchedResData.get(slotId);
            const isOccupied = (slotData && slotData.occupied) || (resData && resData.occupied);
            return {
              ...slot,
              occupied: isOccupied,
              userDetails: isOccupied
                ? { 
                    // Show carPlateNumber from resData if available, otherwise from slotData
                    carPlateNumber: resData?.userDetails?.plateNumber || slotData?.userDetails?.carPlateNumber
                  }
                : undefined,
            };
          }),
        };
      })
    );
  };

  
  const fetchDataAndUpdateSlots = async () => {
    await fetchSlotData();
    await fetchResData();
    updateSlots();
  };

  // Run the async function
  fetchDataAndUpdateSlots();

}, [db, user.managementName]);


useEffect(() => {
  const managementName = user?.managementName;
  if (managementName) {
    const savedSlots = loadSlotsFromLocalStorage(managementName);
    if (savedSlots.length > 0) {
      setSlotSets(savedSlots);
      console.log('Loaded slots from local storage:', savedSlots);
    } else {
      fetchData(managementName);
    }
  }
}, [user?.managementName]);

useEffect(() => {
  console.log('Current slotSets state:', slotSets);
  console.log('Rendering slotSets:', slotSets);
}, [slotSets]);

const savedSlots = useMemo(() => loadSlotsFromLocalStorage(), []);

const fetchData = async (managementName) => {
  if (!user || !user.managementName) {
    console.log('No user logged in or management name is missing');
    return;
  }

  let occupiedSlots = new Map(); 

  try {
    const parkingLogsRef = collection(db, 'logs');
    const parkingLogsQuery = query(parkingLogsRef, where('managementName', '==', user.managementName), where('timeOut', '==', null));
  
    const unsubLogs = onSnapshot(parkingLogsQuery, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => doc.data());

      occupiedSlots = new Map();
      snapshot.forEach(doc => {
        const data = doc.data();
        occupiedSlots.set(data.slotId, doc.id); 
      });
      console.log(snapshot.docs.map(doc => doc.data()));
    });

    const collectionRef = collection(db, 'establishments');
    const q = query(collectionRef, where('managementName', '==', user.managementName));
  
    const unsubEstablishments = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const newEstablishmentData = snapshot.docs.map(doc => doc.data());
        const establishmentData = snapshot.docs[0].data();
  
        let newSlotSets = [];
  
        if (Array.isArray(establishmentData.floorDetails) && establishmentData.floorDetails.length > 0) {
          newSlotSets = establishmentData.floorDetails.map(floor => ({
            title: floor.floorName,
            slots: Array.from({ length: parseInt(floor.parkingLots) }, (_, i) => ({ id: i })),
          }));
        } else if (establishmentData.totalSlots) {
          newSlotSets = [{
            title: 'General Parking',
            slots: Array.from({ length: parseInt(establishmentData.totalSlots) }, (_, i) => ({ id: i })),
          }];
        }
        console.log('New Slot Sets:', newSlotSets);
  
        newSlotSets.forEach((slotSet) => {
          slotSet.slots.forEach((slot) => {
            if (occupiedSlots.has(slot.id)) {
              slot.occupied = true;
              slot.logDocId = occupiedSlots.get(slot.id);
            } else {
              slot.occupied = false;
            }
          });
        });
  
        setSlotSets(newSlotSets);
        saveSlotsToLocalStorage(newSlotSets);
  
        if (savedSlots.length > 0) {
          setSlotSets(savedSlots);
          console.log('Loaded slots from local storage:', savedSlots);
        }
      } else {
        console.log('No such establishment!');
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setIsLoading(false);
  }
};
  
  useEffect(() => {
    const managementName = user?.managementName;
    if (managementName && slotSets.length > 0) {
      saveSlotsToLocalStorage(managementName, slotSets);
    }
  }, [slotSets, user?.managementName]); 
  
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [zoneAvailableSpaces, setZoneAvailableSpaces] = useState(
    initialSlotSets.map(zone => zone.slots.length)
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'slot', user.managementName, 'slotData')), (snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const slotId = doc.id; 
        const slotIndex = slotSets[currentSetIndex].slots.findIndex(slot => `slot_${slot.id}` === slotId);
  
        if (slotIndex > -1) {
          const newSlotSets = [...slotSets];
          newSlotSets[currentSetIndex].slots[slotIndex] = { ...newSlotSets[currentSetIndex].slots[slotIndex], occupied: data.status === 'Occupied' };
          setSlotSets(newSlotSets);
        }
      });
    });
  
    return () => unsubscribe();
  }, [db, user.managementName, currentSetIndex, slotSets]);

  const [recordFound, setRecordFound] = useState(true); 
  const [userFound, setUserFound] = useState(true);
  const searchInFirebase = async (searchInput) => {
    try {
      const collectionRef = collection(db, 'user');
      const q = query(collectionRef, where('carPlateNumber', '==', searchInput));
      const querySnapshot = await getDocs(q);
  
      const user = querySnapshot.docs.find(doc => doc.data().carPlateNumber === searchInput);
  
      if (user) {
        console.log('Found user:', user.data());
        setUserPlateNumber(user.data().carPlateNumber);
        setUserDetails(user.data());
        setUserFound(true);
      } else {
        console.log('User not found.');
        setUserDetails({}); 
        setUserPlateNumber(searchInput);
        setUserFound(false); 
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const navigate = useNavigate();

  const handleButtonClick = () => {
  navigate("/Reservation");
 };

  const rows = 5;
  const cols = 3;

  const handleNext = () => {
    if (currentSetIndex < slotSets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(currentSetIndex - 1);
    }
  };

  const [showModal, setShowModal] = useState(false); 
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedPlateNumber, setSelectedPlateNumber] = useState(""); 
  const [agent, setAgentName] = useState (user.firstName || "");
  const [agentL, setAgentLName] = useState (user.lastName || "");
  const [managementName, setManagementName] = useState (user.managementName || "");
  const fullName = `${agent} ${agentL}`;
  const [errorMessage, setErrorMessage] = useState("");
  
  const addToLogs = async (userDetails, slotNumber) => {
    try {
      const logsCollectionRef = collection(db, 'logs'); 
      const timestamp = new Date();
      const logData = {
        ...userDetails,
        status: 'Occupied',
        timeIn: timestamp,
        timeOut: null,
        agent: fullName,
        managementName: managementName,
      };
  
      const docRef = await addDoc(logsCollectionRef, logData);
      console.log('Log added with ID: ', docRef.id);
    } catch (error) {
      console.error('Error adding log: ', error);
    }
  };
  
  
  const [userDetails, setUserDetails] = useState({});
  const [userPlateNumber, setUserPlateNumber] = useState("");

  const getContinuousSlotNumber = (currentSetIndex, slotIndex) => {
    let previousSlots = 0;
    for (let i = 0; i < currentSetIndex; i++) {
      previousSlots += slotSets[i].slots.length;
    }
    return previousSlots + slotIndex + 1;
  };
  const handleAddToSlot = (carPlateNumber, slotIndex) => {
    if (!carPlateNumber || carPlateNumber.trim() === "") {
      setErrorMessage("Please enter a plate number.");
      return;
    }
    if (!userFound) {
      const confirmAssign = window.confirm("No record found. Do you want to proceed?");
      if (!confirmAssign) {
        return;
      }
    }
    const floorTitle = slotSets[currentSetIndex].title || "General Parking";
    const uniqueElement = new Date().getTime(); 
    const uniqueSlotId = `${floorTitle}-${slotIndex}-${uniqueElement}`;
    const uniqueDocName = `slot_${floorTitle}_${slotIndex}`; 


    const updatedSets = [...slotSets];
    const timestamp = new Date();

    const updatedUserDetails = {
      carPlateNumber,
      slotId: slotIndex,
      email: userDetails?.email || "",
      contactNumber: userDetails?.contactNumber || "",
      carPlateNumber: userDetails?.carPlateNumber || carPlateNumber,
      car: userDetails?.car || "",
      gender: userDetails?.gender || "",
      age: userDetails?.age || "",
      address: userDetails?.address || "",
      name: userDetails?.name || "",
      agent: fullName,
      floorTitle,
      timestamp,
    };

    updatedSets[currentSetIndex].slots[slotIndex] = {
      text: carPlateNumber,
      occupied: true,
      timestamp: timestamp,
      userDetails: updatedUserDetails,
    };

    setSlotSets(updatedSets);
    saveSlotsToLocalStorage(managementName, updatedSets);
    addToLogs(updatedUserDetails, slotIndex);


    const managementDocRef = doc(db, 'slot', managementName);
    const slotCollectionRef = collection(managementDocRef, 'slotData');
    const slotDocRef = doc(slotCollectionRef, uniqueDocName);
  
    const slotUpdate = { 
      status: 'Occupied', 
      slotId: uniqueSlotId, 
      userDetails: updatedUserDetails 
    };

     setDoc(slotDocRef, slotUpdate, { merge: true })
    .then(() => console.log(`Slot ${uniqueSlotId} status updated in Firebase under ${managementName}, floor ${floorTitle}`))
    .catch(error => console.error('Error updating slot status in Firebase:', error));
  
    setErrorMessage("");
};

const handleAcceptReservation = async (reservationId, slotId) => {
  // Ensure user context is available
  if (!user || !user.managementName) {
    console.error('User context with managementName is required.');
    return;
  }

  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationSnapshot = await getDoc(reservationRef);
    if (!reservationSnapshot.exists()) {
      console.error('No such reservation!');
      return;
    }
    const reservationData = reservationSnapshot.data();
    const reservationTimestamp = reservationData.timestamp;

    const slotDocRef = doc(db, 'slot', user.managementName, 'slotData', `slot_${slotId}`);
    await setDoc(slotDocRef, {
      status: 'Occupied',
      userDetails: {
        name: reservationData.userName,
        email: reservationData.userEmail,
      },
      timestamp: reservationTimestamp 
    }, { merge: true });
    setSlotSets((prevSlotSets) => {
      return prevSlotSets.map((slotSet, setIndex) => {
        if (setIndex === currentSetIndex) {
          return {
            ...slotSet,
            slots: slotSet.slots.map((slot, index) => {
              if (index === slotId) { 
                return { ...slot, occupied: true };
              }
              return slot;
            }),
          };
        }
        return slotSet;
      });
    });
    saveSlotsToLocalStorage(user.managementName, slotSets);
    console.log(`Reservation accepted for slot ID: ${slotId}`);

  } catch (error) {
    console.error('Error accepting reservation:', error);
  }
};

  
  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    setShowModal(true);
    setUserDetails(slotSets[currentSetIndex].slots[index]?.userDetails || null);
  };
  
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const handleExitSlot = async (slotIndex) => {
    if (!slotSets[currentSetIndex].slots[slotIndex].occupied) {
      setErrorMessage("This slot is already empty.");
      return;
    }
  
    const slotTitleFormatted = slotSets[currentSetIndex].title.replace(/\s+/g, '_');
    const slotDocId = `slot_${slotTitleFormatted}_${slotIndex}`;
    const slotDocRef = doc(db, 'slot', user.managementName, 'slotData', slotDocId);
  
    try {
      await deleteDoc(slotDocRef);
      console.log(`Slot data deleted from Firestore under ${user.managementName}, slot id: ${slotDocId}`);
    } catch (error) {
      console.error('Error deleting slot data from Firestore:', error);
      setErrorMessage('Error processing slot exit. Please try again.');
      return;
    }
  
  
    const resTitleFormat = slotSets[currentSetIndex].title.replace(/\s+/g, ' '); 
  const resDocIdPattern = /^slot_[a-zA-Z]+_\d+$/;


  let potentialResDocId = `slot_${resTitleFormat}_${slotIndex}`;

  if (resDocIdPattern.test(potentialResDocId)) {
    potentialResDocId = `slot_${resTitleFormat}_${slotIndex + 3}`;
  } else {
    potentialResDocId = `slot_${resTitleFormat}_${slotIndex + 1}`;
  }

  const resDocRef = doc(db, 'res', user.managementName, 'resData', potentialResDocId);
  try {
    await deleteDoc(resDocRef);
    console.log(`Reservation data deleted from Firestore under ${user.managementName}, slot id: ${potentialResDocId}`);
  } catch (error) {
    console.error('Error deleting reservation data from Firestore:', error);
  }
  
    const updatedSets = slotSets.map((slotSet, setIdx) => {
      if (setIdx === currentSetIndex) {
        const updatedSlots = slotSet.slots.map((slot, idx) => {
          if (idx === slotIndex) {
            return { ...slot, occupied: false, userDetails: null };
          }
          return slot;
        });
        return { ...slotSet, slots: updatedSlots };
      }
      return slotSet;
    });
    setSlotSets(updatedSets);
    // Log the exit in the logs collection
    const userDetails = slotSets[currentSetIndex].slots[slotIndex].userDetails;
    if (userDetails && userDetails.carPlateNumber) {
      const logData = {
        carPlateNumber: userDetails.carPlateNumber,
        timeOut: new Date(),
        paymentStatus: 'Paid',
      };
  
      try {
        const logsCollectionRef = collection(db, 'logs');
        const q = query(logsCollectionRef, where('carPlateNumber', '==', userDetails.carPlateNumber), where('timeOut', '==', null));
        const querySnapshot = await getDocs(q);
  
        querySnapshot.forEach(async (docSnapshot) => {
          const logDocRef = docSnapshot.ref;
          await setDoc(logDocRef, logData, { merge: true });
          console.log(`Log updated for car plate: ${userDetails.carPlateNumber}`);
        });
      } catch (error) {
        console.error('Error updating logs: ', error);
      }
    }
  
    // Clear any error messages and close the confirmation dialog
    setErrorMessage('');
    setShowExitConfirmation(false);
  };
  
  
  
  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
  };
  const handleCancelExit = () => {
    setShowExitConfirmation(false); 
  };
  
  return (
    <div style={{ textAlign: 'center' }}>
        < nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#003851" }}>
        <div className="container">
          <Link className="navbar-brand" to="/">
            SpotWise Parking Management System
          </Link>
          <p style={styles.welcomeMessage}>
            <DropdownButton 
            variant="outline-light"
                alignRight
                title={<FaUserCircle style={styles.icon} />}
                id="dropdown-menu"
              >
                <Dropdown.Item href="OperatorDashboard"><img
                        src="dashboard.jpg"
                        alt="Operator Dashboard Logo"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Records</Dropdown.Item>
                      <Dropdown.Item href="OperatorProfile">
                <img
                        src="opname.jpg"
                        alt="Operator Profile Logo"
                        style={{ width: '20px', marginRight: '10px'}}
                      />Profile</Dropdown.Item>
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
      <div style={{ textAlign: 'center', fontSize: '15px', marginTop:'10px', marginBottom:'15px'}}>
      {slotSets.length > 0 && (
     <div>
     <h3>{slotSets[currentSetIndex].title}</h3>
     </div>
       )}
       {slotSets.length === 0 && !isLoading && <div>No parking zones available.</div>}
     </div>
        <div className='parkingGrid'
       
      >
       {slotSets[currentSetIndex] && slotSets[currentSetIndex].slots.map((slot, index) => (

  <div
    key={index}
    style={{
      width: '90px',
      height: '80px',
      backgroundColor: slot.occupied ? 'red' : 'green',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      marginLeft: '35px',
    }
  }
    onClick={() => handleSlotClick(index)}
  >
    {slot.occupied ? (
      <div>
        <div>{slot.userDetails ? slot.userDetails.carPlateNumber : getContinuousSlotNumber(currentSetIndex, index)}</div>
      </div>
    ) : (
      getContinuousSlotNumber(currentSetIndex, index)
    )}
  </div>
))}
</div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Parking Slot {selectedSlot + 1}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
  {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
 
  {selectedSlot !== null && (
  <SearchForm
  onSearch={searchInFirebase}
  onSelectSlot={(carPlateNumber) => handleAddToSlot(carPlateNumber, selectedSlot)}
  onExitSlot={() => handleExitSlot(selectedSlot)}
  selectedSlot={selectedSlot}
  userDetails={userDetails}
/>

  )}
{selectedSlot !== null && userDetails !== null && (
  <div style={{ marginTop: '10px' }}>
    <h4>User Details:</h4>
    <p>Email: {userDetails.email}</p>
    <p>Contact Number: {userDetails.contactNumber}</p>
    <p>Car Plate Number: {userDetails.carPlateNumber}</p>
    <p>Gender: {userDetails.gender}</p>
    <p>Age: {userDetails.age}</p>
    <p>Address: {userDetails.address}</p>
    {slotSets[currentSetIndex].slots[selectedSlot].timestamp && (
      <p>Timestamp: {slotSets[currentSetIndex].slots[selectedSlot].timestamp.toString()}</p>
    )}
  </div>
)}
  </Modal.Body>
  <Modal.Footer>
  {recordFound ? null : <div style={{ color: 'red' }}>No record found for this car plate number.</div>}
  </Modal.Footer>
</Modal>
    <Modal show={showExitConfirmation} onHide={handleCancelExit}>
      <Modal.Header closeButton>
        <Modal.Title>Confirmation</Modal.Title>
      </Modal.Header>
      <Modal.Body>Are you sure you want to vacant this slot?</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancelExit}>
          No
        </Button>
        <Button variant="primary" onClick={handleConfirmExit}>
          Yes
        </Button>
      </Modal.Footer>
    </Modal>

    <div style={{ textAlign: 'center', marginTop: '10px' }}>
      <Button onClick={handleButtonClick}>Manage Reservation</Button>
    </div>
    
      <div style={{textAlign: 'center', fontFamily:'Georgina', fontSize:'15px', marginTop:'10px'}}>
          <span>  Total Parking Spaces: {totalParkingSpaces}</span>
          <br />
          <span> Available Spaces: {availableParkingSpaces}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '5px', fontSize:'15px'}}>
            <div style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'green', marginRight: '10px' }}></div>
                <span>Available</span>
                     <div style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'red', marginLeft: '20px', marginRight: '10px' }}></div>
                 <span>Occupied</span>
            </div>
      <div style={{textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginTop: '5px', marginLeft:'450px', marginBottom:'5px'}}>
          <Button onClick={handlePrev} style={{ marginRight: '20px', backgroundColor: 'gray' }}>Prev</Button>
          <Button onClick={handleNext}>Next</Button>
        </div>
    </div>
    
  );
};

export default ParkingSlot;