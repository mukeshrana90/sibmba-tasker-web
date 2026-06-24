import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { buildPublicAssetUrl } from "../utils/landingUtils";

const FALLBACK_THUMB = require("../Assets/Images/living-room-cleaning.png");

export default function TrainingMaterial() {
  const dispatch = useDispatch();
  const [selectedTraining, setSelectedTraining] = useState(null);
  const trainingDetail = useSelector((e) => e.UserSlice.trainingListData);

  useEffect(() => {
    dispatch(CustomerActions.trainingListing());
  }, [dispatch]);

  useEffect(() => {
    if (trainingDetail?.length > 0 && !selectedTraining) {
      setSelectedTraining(trainingDetail[0]);
    }
  }, [trainingDetail, selectedTraining]);

  const videoSrc = selectedTraining?.video
    ? buildPublicAssetUrl(selectedTraining.video) ||
      `https://api.simbatasker.com${selectedTraining.video}`
    : "";

  return (
    <CorporatePageShell pageClass="p-training" showBanner={false}>
      <div className="course-grid">
        {trainingDetail?.map((training) => (
          <button
            key={training._id}
            type="button"
            className={`course-card${
              selectedTraining?._id === training._id ? " active" : ""
            }`}
            onClick={() => setSelectedTraining(training)}
          >
            <div className="cc-img">
              <img src={FALLBACK_THUMB} alt={training.title} />
              <div className="cc-play">
                <span>▶</span>
              </div>
            </div>
            <div className="cc-cat">{training.title}</div>
            <div className="cc-title">{training.title}</div>
          </button>
        ))}
      </div>

      {selectedTraining ? (
        <div className="tm-detail">
          <div className="tm-video">
            {videoSrc ? <video src={videoSrc} controls /> : null}
          </div>
          <div className="tm-info">
            <h2>{selectedTraining.title}</h2>
            <p className="tm-cat">{selectedTraining.title}</p>
            {selectedTraining.description ? (
              <p className="tm-desc">{selectedTraining.description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </CorporatePageShell>
  );
}
