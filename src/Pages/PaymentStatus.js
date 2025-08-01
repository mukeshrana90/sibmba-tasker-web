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
      <div className="payment-model">
            <div className="payment-model-inner">
                <h2 className="text-xl font-bold mb-4 text-center">Payment Status</h2>
                <div className="text-center">
                    <h5 className="text-md font-semibold text-gray-700 mb-2">Message :</h5>
                    <div className="flex justify-center">
                      <p className="text-gray-800">{message}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentStatus