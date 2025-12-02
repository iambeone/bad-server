import { errors } from 'celebrate'
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import { csrfGuard } from './middlewares/csrf-guard'
import routes from './routes'
import rateLimit from 'express-rate-limit'

const { PORT = 3000 } = process.env
const { ORIGIN_ALLOW } = process.env

const app = express()
const staticDir = path.join(__dirname, '..', 'public');
app.use(serveStatic(staticDir));

app.use(cookieParser())

app.use(cors({
  origin: ORIGIN_ALLOW || 'http://localhost:5173',
  credentials: true,
}))

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true, limit: '1mb' }))
app.use(json({ limit: '1mb' }))

app.use(
  mongoSanitize({
    replaceWith: '_',
  })
)

app.use(csrfGuard)
app.options('*', cors())
const customersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/customers', customersLimiter);
app.use(routes)
app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
