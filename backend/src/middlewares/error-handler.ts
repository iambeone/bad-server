import { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  console.error('GLOBAL ERROR:', err);
  const message =
    statusCode === 500 ? err.message : 'На сервере произошла ошибка' ;

  console.log(err);

  return res.status(statusCode).send({ message });
};

export default errorHandler;