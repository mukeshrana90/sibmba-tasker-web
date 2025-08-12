import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom';
import CustomerActions from '../../Redux/Actions/CustomerActions';
import { useDispatch } from 'react-redux';

const SubscriptionCancel = () => {
    const { transactionId } = useParams();

    return (
        <div>SubscriptionCancel</div>
    )
}

export default SubscriptionCancel