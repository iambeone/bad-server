import Button from '@components/button/button'
import Form, { Input } from '@components/form'
import useFormWithValidation from '@components/form/hooks/useFormWithValidation'
import { SyntheticEvent, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDispatch } from '../../services/hooks'
import { AppRoute } from '../../utils/constants'
import { LoginFormValues } from './helpers/types'
import styles from './login-page.module.scss'
import { loginUser } from '@slices/user/thunk'
export default function LoginPage() {
  const dispatch = useDispatch()
  const formRef = useRef<HTMLFormElement>(null);
  const { values, handleChange, errors, isValid } =
    useFormWithValidation<LoginFormValues>(
      { email: '', password: '' },
      formRef.current
    );

  const handleFormSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(loginUser(values))
      .unwrap()
      .catch((err) => {
        toast.error(err.message);
      });
    };

    return (
        <div className={styles.login}>
            <Form
                formRef={formRef}
                handleFormSubmit={handleFormSubmit}
                extraClass={styles.login__container}
            >
                <h1 className={styles.login__title}>Вход</h1>
                <Input
                    value={values.email || ''}
                    onChange={handleChange}
                    name='email'
                    type='email'
                    placeholder='Введите email'
                    label='Email'
                    required
                    error={errors.email}
                />
                <Input
                    value={values.password || ''}
                    onChange={handleChange}
                    name='password'
                    type='password'
                    placeholder='Введите пароль'
                    label='Пароль'
                    required
                    error={errors.password}
                />
                <Button
                    type='submit'
                    extraClass={styles.login__button}
                    disabled={!isValid}
                >
                    Войти
                </Button>
                <Link to={AppRoute.Register} className={styles.login__link}>
                    Зарегистрироваться
                </Link>
            </Form>
        </div>
    )
}
