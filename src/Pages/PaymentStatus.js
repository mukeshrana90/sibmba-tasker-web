import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import ProductActions from '../Redux/Actions/ProductActions';

const PaymentStatus = () => {
    const { purchaseproductid } = useParams();
    const dispatch = useDispatch();
    const [message,setMessage] = useState("")
    useEffect(() => {
        if (purchaseproductid) {
            getDetails();
        }
    }, [purchaseproductid, dispatch]);

    const getDetails =async()=>{
        try{
            const response = await dispatch(ProductActions.PaymentStatusCheck({ purchaseproductid }));
            if(response?.payload){
                setMessage(response?.payload?.message)
            }
        }catch(error){

        }
    }
    return (
        <div><p>{message}</p></div>
    )
}

export default PaymentStatus