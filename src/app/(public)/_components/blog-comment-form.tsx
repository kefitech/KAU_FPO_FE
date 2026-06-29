"use client";
import { useState } from "react";

const BlogCommentForm = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (e.target as HTMLFormElement).reset();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form className="contact-comments" onSubmit={handleSubmit}>
      {submitted && <p style={{ color: "green", marginBottom: "10px" }}>Thanks For Your Message!</p>}
      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
            <input name="name" className="form-control" placeholder="Name *" type="text" required autoComplete="off" />
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <input name="email" className="form-control" placeholder="Email *" type="email" required autoComplete="off" />
          </div>
        </div>
        <div className="col-md-12">
          <div className="form-group comments">
            <textarea className="form-control" name="textarea" placeholder="Comment" required autoComplete="off" />
          </div>
          <div className="form-group full-width submit">
            <button className="btn animation dark border" type="submit">Post Comment</button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default BlogCommentForm;
