import { Router } from 'express';
import {
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from '../controllers/customers';
import { roleGuardMiddleware } from '../middlewares/auth';
import { Role } from '../models/user';
import rateLimit from 'express-rate-limit';

const customersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const customerRouter = Router();

// список всех клиентов — только для админа
customerRouter.get('/', roleGuardMiddleware(Role.Admin), getCustomers);

// остальные ручки — только аутентификация (она уже навешана в index router)
customerRouter.get('/:id', getCustomerById);
customerRouter.patch('/:id', updateCustomer);
customerRouter.delete('/:id', deleteCustomer);

export default customerRouter;