const HeaderTop = () => {
  return (
    <div className="top-bar-area text-light">
      <div className="container">
        <div className="row align-center">
          <div className="col-lg-9">
            <div className="flex-item left">
              <p>That&apos;s right, we only sell 100% organic</p>
              <ul>
                <li><i className="fas fa-map-marker-alt" /> California, TX 70240</li>
                <li><i className="fas fa-phone-alt" /> +4733378901</li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 text-end">
            <div className="social">
              <ul>
                <li><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                <li><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube" /></a></li>
                <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderTop;
