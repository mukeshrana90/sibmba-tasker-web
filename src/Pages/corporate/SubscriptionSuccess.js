import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import CustomerActions from '../../Redux/Actions/CustomerActions';

const SubscriptionSuccess = () => {
    const { transactionId } = useParams();
    const dispatch = useDispatch();
    const Navigate = useNavigate();
    const [planData,setPlanData] = useState({});


    useEffect(() => {
        if(transactionId){
            handleStatusChange();
        }
    }, [transactionId]);

    const handleStatusChange = async () => {
        try {
            let res = await dispatch(CustomerActions.updateSubscriptionPaymentStatus(transactionId));
            console.log(res,'---------')
            if (res && res.payload) {
                setPlanData(res.payload?.data)
                // setTimeout(()=>Navigate("/"),10000)
            }
        } catch (error) {

        }

    }

    return (
        <div>{planData?.subscriptionPlan}</div>
    )
}

export default SubscriptionSuccess