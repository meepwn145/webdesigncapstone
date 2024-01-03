import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useNavigate, Link } from "react-router-dom";
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { FaUserCircle } from "react-icons/fa";
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase'; 

function Calendar() {
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState(new Date());
  const [eventStartTime, setEventStartTime] = useState("00:00");
  const [eventEndDate, setEventEndDate] = useState(new Date());
  const [eventEndTime, setEventEndTime] = useState("00:00");
  const [eventEmail, setEventEmail] = useState("");
  const [eventAgentName, setEventAgentName] = useState("");
  const [eventAgentName1, setEventAgentName1] = useState("");
  const [events, setEvents] = useState([]);
  const [clickedEventDetails, setClickedEventDetails] = useState("");
  const [eventTimeIn, setEventTimeIn] = useState("00:00");
const [eventTimeOut, setEventTimeOut] = useState("00:00");
const [filteredEmails, setFilteredEmails] = useState([]);

  const navigate = useNavigate();

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


  const [isTitleValid, setIsTitleValid] = useState(true);
  const [isStartDateValid, setIsStartDateValid] = useState(true);
  const [isEndDateValid, setIsEndDateValid] = useState(true);

  const handleButtonClick = () => {
    navigate("/Dashboard");
  };
  const handleModalOpen = () => {
    setShowModal(true);
    setEventTimeIn("00:00");
    setEventTimeOut("00:00");
  };
  

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleEventSubmit = () => {
    let isValid = true;

    if (!eventTitle) {
      setIsTitleValid(false);
      isValid = false;
    } else {
      setIsTitleValid(true);
    }

    if (!eventStartDate) {
      setIsStartDateValid(false);
      isValid = false;
    } else {
      setIsStartDateValid(true);
    }

    if (!eventEndDate || eventEndDate < eventStartDate) {
      setIsEndDateValid(false);
      isValid = false;
    } else {
      setIsEndDateValid(true);
    }

    if (isValid) {
      const CST_OFFSET = 8 * 60;
      const PST_OFFSET = 8 * 60;

      const startDateTime = new Date(
        `${eventStartDate.toISOString().split('T')[0]}T${eventStartTime}`
      );
      
      const endDateTime = new Date(
        `${eventEndDate.toISOString().split('T')[0]}T${eventEndTime}`
      );
      const currentTime = new Date();
      if (endDateTime > currentTime) {
        alert('Cannot add an event that has already ended.');
        return;
      }
      const startTimestamp = startDateTime.getTime() + CST_OFFSET * 60000;
      const endTimestamp = endDateTime.getTime() + CST_OFFSET * 60000;
      startDateTime.setTime(startTimestamp + PST_OFFSET * 60000);
      endDateTime.setTime(endTimestamp + PST_OFFSET * 60000);

      const newEvent = {
        title: eventTitle,
        start: startDateTime,
        end: endDateTime,
        email: eventEmail,
        name: eventAgentName,
        lastName: eventAgentName1,
        timeIn: eventTimeIn,
        timeOut: eventTimeOut,
      };

      const firestore = getFirestore();

      addDoc(collection(firestore, 'schedule'), newEvent)
        .then((docRef) => {
          console.log('Event added with ID: ', docRef.id);
          
          setEvents([...events, newEvent]);
  
          setEventTitle('');
          setEventStartDate(new Date());
          setEventStartTime('00:00');
          setEventEndDate(new Date());
          setEventEndTime('00:00');
          setEventEmail('');
          setEventAgentName('');
          setEventAgentName1('');
          setEventTimeIn('00:00');
          setEventTimeOut('00:00');
  
       
          setShowModal(false);
        })
        .catch((error) => {
          console.error('Error adding event: ', error);
        });
    }
  };


  const handleEmailClick = (email) => {
    const agent = filteredAgents.find(agent => agent.email === email);
    console.log(agent); 
    if (agent) {

      setEmailAndName(email, agent.name);
    }
  };
  
  const fetchAgents = async (input) => {
    if (input.length === 0) {
      setFilteredAgents([]);
      return;
    }
  
    
    const querySnapshot = await getDocs(query(collection(db, "agents"), where("email", ">=", input), where("email", "<=", input + '\uf8ff')));
    const matchedAgents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  
    setFilteredAgents(matchedAgents);
  };

  const [filteredAgents, setFilteredAgents] = useState([]);
  const setEmailAndName = (email, name, lName) => {
    console.log('Setting email and name:', email, name, lName);
    setEventAgentName(name);
    setEventAgentName1(lName);
    setFilteredAgents([]); 
  };
  

  useEffect(() => {
    
    const loadEvents = async () => {
      
      const eventsCollection = collection(db, "schedule");
      const eventsSnapshot = await getDocs(eventsCollection);
      const loadedEvents = eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      
      const currentEvents = loadedEvents.filter(event => {
        const now = new Date();
        return new Date(event.end.seconds * 1000) > now; 
      });
  
      setEvents(currentEvents);
    };
  
    loadEvents();
  }, []);

  
  const handleEventClick = (info) => {
    const clickedEvent = info.event;
  
    const clickedEventDetails = {
      title: clickedEvent.title,
      start: clickedEvent.start.getTime(), 
      end: clickedEvent.end.getTime(), 
      email: clickedEvent.extendedProps.email,
      name: clickedEvent.extendedProps.name,
    };
  
    setShowModal(true);
    setClickedEventDetails(clickedEventDetails);
  };
  
  const emailColorMap = {
    "richardm@gmail.com": "blue",
    "markym@gmail.com": "green",
  };
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#003851", marginBottom:'20px' }}>
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
              <Dropdown.Item href="Profiles"><img
                        src="pofile.jpg"
                        alt="Management Details"
                        style={{ width: '20px', marginRight: '10px'}}
                      />View Profile</Dropdown.Item>
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
      <FullCalendar 
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          start: "today prev,next",
          center: "title",
          end: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="90vh"
        events={events}
        eventClick={handleEventClick}
        timeZone="Asia/Manila"
        locale="en"
      />
       <Modal show={showModal} onHide={handleModalClose} style={{fontFamily:'Georgina', fontSize:'18px'}}>
  <Modal.Header closeButton>
    <Modal.Title>Event Details</Modal.Title>
  </Modal.Header>
  <Modal.Body>
  <p>Title: {clickedEventDetails.title}</p>
<p>Start: {new Date(clickedEventDetails.start).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>
<p>End: {new Date(clickedEventDetails.end).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>
<p>Email: {clickedEventDetails.email}</p>
<p>Agent Name: {clickedEventDetails.name}</p>

  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleModalClose}>
      Close
    </Button>
  </Modal.Footer>
</Modal>
      <Button onClick={handleModalOpen} style={{ marginTop: "10px", marginLeft: "100vh" }}>
        Add Event
      </Button>
      <Modal show={showModal} onHide={handleModalClose} style={{fontFamily:'Georgina', fontSize:'18px'}}>
        <Modal.Header closeButton>
          <Modal.Title>Add Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="eventTitle">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter event title"
                value={eventTitle}
                onChange={(e) => {
                  setEventTitle(e.target.value);
                  setIsTitleValid(true);
                }}
                isInvalid={!isTitleValid}
              />
              {!isTitleValid && <Form.Control.Feedback type="invalid">Please enter a title.</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group controlId="eventStartDate">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={eventStartDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  setEventStartDate(new Date(e.target.value));
                  setIsStartDateValid(true);
                }}
                isInvalid={!isStartDateValid}
              />
              {!isStartDateValid && <Form.Control.Feedback type="invalid">Please select a valid start date.</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group controlId="eventEndDate">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={eventEndDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  setEventEndDate(new Date(e.target.value));
                  setIsEndDateValid(true);
                }}
                isInvalid={!isEndDateValid}
              />
              {!isEndDateValid && <Form.Control.Feedback type="invalid">Please select a valid end date.</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group controlId="eventTimeIn">
  <Form.Label>Time In</Form.Label>
  <Form.Control
    type="time"
    value={eventTimeIn}
    onChange={(e) => setEventTimeIn(e.target.value)}
  />
</Form.Group>
<Form.Group controlId="eventTimeOut">
  <Form.Label>Time Out</Form.Label>
  <Form.Control
    type="time"
    value={eventTimeOut}
    onChange={(e) => setEventTimeOut(e.target.value)}
  />
</Form.Group>
<Form.Group controlId="eventEmail">
  <Form.Label>Email</Form.Label>
  <Form.Control
    type="email"
    placeholder="Enter email"
    value={eventEmail}
    onChange={(e) => {
      setEventEmail(e.target.value);
      fetchAgents(e.target.value);
    }}
  />
 <ul style={{ listStyleType: "none", padding: 0, position: 'absolute', zIndex: 1000 }}>
  {filteredAgents.map((agent) => (
    <li key={agent.id} onClick={() => setEmailAndName(agent.email, agent.firstName, agent.lastName)} style={{ cursor: 'pointer' }}>
      {agent.email}
    </li>
  ))}
</ul>

</Form.Group>
<Form.Group controlId="eventAgentName">
  <Form.Label style={{marginTop:"20px"}}>Agent Name</Form.Label>
    <Form.Control
      type="text"
      placeholder="Agent name will be set automatically"
      value={`${eventAgentName} ${eventAgentName1}`}
      onChange={(e) => setEventAgentName(e.target.value)}
      disabled={true} 
    />
</Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEventSubmit}>
            Add Event
          </Button>
        </Modal.Footer>
        </Modal>
    </div>
  );
}

export default Calendar;