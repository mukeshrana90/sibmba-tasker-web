import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Slider from 'rc-slider';
import DatePicker from 'react-datepicker';
import 'rc-slider/assets/index.css';
import 'react-datepicker/dist/react-datepicker.css';
import { useDispatch } from 'react-redux';
import CustomerActions from '../../Redux/Actions/CustomerActions';
import ServiceActions from '../../Redux/Actions/ServiceActions';

const FilterModal = ({ show, handleClose, type }) => {
  const dispatch = useDispatch()
  const [service, setService] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('10-11 AM');
  const [budgetRange, setBudgetRange] = useState([0, 10000]);

  const times = [
    '08-09 am', '10-11 am', '11-12 am', '04-06 pm',
    '05-06 pm', '06-07 pm', '07-08 pm'
  ];

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const tabType = {
    'first': "tasks",
    'third': "acceptedTasks"
  }

  const handleSearch = async () => {
    const rawParams = {
      need_done: service,
       budget: budgetRange[1].toString(),
      when_done: formatDate(selectedDate),
      task_time: selectedTime,
      type: tabType[type]
    };
    const params = Object.fromEntries(
      Object.entries(rawParams).filter(([_, value]) => value != null && value !== "")
    );

    dispatch(ServiceActions.getPostTaskList(params));
    handleClose();
  };


  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="border-none pb-0">
        <Modal.Title>Service</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="book-service-view">
          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-100 p-2 border rounded"
            placeholder="Enter service"
          />
        </div>
        <div className="book-service-select">
          <h3>Select Date</h3>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd-MM-yyyy"
            className="w-100 p-2 border rounded"
            minDate={new Date()}
          />
        </div>
        <div className="book-service-select mt-3">
          <h3>Select Time</h3>
          <ul>
            {times.map((t) => (
              <li
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`cursor-pointer px-4 py-2 rounded ${selectedTime == t ? 'active' : ''}`}
              >
                <p className="mb-0">{t}</p>
              </li>
            ))}
          </ul>
        </div>
        <h5 className="text-sm font-medium mb-3">Budget</h5>
        <div className="">
          <Slider
            range
            min={0}
            max={10000}
            value={budgetRange}
            onChange={(value) => setBudgetRange(value)}
            trackStyle={{ backgroundColor: '#10B981' }}
            handleStyle={{ borderColor: '#10B981', backgroundColor: '#10B981' }}
          />
          <div className="flex justify-between text-sm mt-2">
            <span>${budgetRange[0]} - ${budgetRange[1]}</span>
          </div>
        </div>
        <div className="quotation-requestss mt-3">
          <button className="btn-fill" type='button' onClick={handleSearch}>
            Search
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default FilterModal;