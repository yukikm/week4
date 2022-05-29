import detectEthereumProvider from "@metamask/detect-provider"
import { Strategy, ZkIdentity } from "@zk-kit/identity"
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols"
import { providers } from "ethers"
import Head from "next/head"
import React from "react"
import styles from "../styles/Home.module.css"
import { useForm } from "react-hook-form";
import { TextField, Button, Stack, Box } from "@mui/material";
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const registerMui = (res: any) => ({
    inputRef: res.ref,
    onChange: res.onChange,
    onBlur: res.onBlur,
    name: res.name,
})

const schema = yup.object({
    email: yup
      .string()
      .required('Required')
      .email('Check your email address'),
    name: yup.string().required('Required'),
    age: yup
      .number()
      .required('Required')
})

export default function Home() {
    const [logs, setLogs] = React.useState("Connect your wallet and greet!")
    const [newgreeting, setNewGreeting] = React.useState("Response");
    const { register, handleSubmit, formState: { errors } } = useForm({resolver: yupResolver(schema),});
    const onSubmit = (data: any) => console.log(data);

    async function greet() {
        setLogs("Creating your Semaphore identity...")

        const provider = (await detectEthereumProvider()) as any

        await provider.request({ method: "eth_requestAccounts" })

        const ethersProvider = new providers.Web3Provider(provider)
        const signer = ethersProvider.getSigner()
        const message = await signer.signMessage("Sign this message to create your identity!")

        const identity = new ZkIdentity(Strategy.MESSAGE, message)
        const identityCommitment = identity.genIdentityCommitment()
        const identityCommitments = await (await fetch("./identityCommitments.json")).json()

        const merkleProof = generateMerkleProof(20, BigInt(0), identityCommitments, identityCommitment)

        setLogs("Creating your Semaphore proof...")

        const greeting = "Hello world"

        const witness = Semaphore.genWitness(
            identity.getTrapdoor(),
            identity.getNullifier(),
            merkleProof,
            merkleProof.root,
            greeting
        )

        const { proof, publicSignals } = await Semaphore.genProof(witness, "./semaphore.wasm", "./semaphore_final.zkey")
        const solidityProof = Semaphore.packToSolidityProof(proof)

        const response = await fetch("/api/greet", {
            method: "POST",
            body: JSON.stringify({
                greeting,
                nullifierHash: publicSignals.nullifierHash,
                solidityProof: solidityProof
            })
        })

        if (response.status === 500) {
            const errorMessage = await response.text()

            setLogs(errorMessage)
        } else {
            const resMessage = await response.text()
            setNewGreeting(resMessage)
            setLogs("Your anonymous greeting is onchain :)")
        }
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Greetings</title>
                <meta name="description" content="A simple Next.js/Hardhat privacy application with Semaphore." />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>Greetings</h1>

                <p className={styles.description}>A simple Next.js/Hardhat privacy application with Semaphore.</p>

                <div className={styles.logs}>{logs}</div>

                <div onClick={() => greet()} className={styles.button}>
                    Greet
                </div>
                
                <div className={styles.dummy}></div>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={2}>
                        <TextField label="Name" type="text"
                            {...registerMui(register('name'))}
                            error={"name" in errors}
                            helperText={errors.name?.message}
                        />
                        <TextField label="Email" type="text"
                            {...registerMui(register('email'))}
                            error={"email" in errors}
                            helperText={errors.email?.message}
                        />
                        <TextField label="Age" type="text"
                            {...registerMui(register('age'))}
                            error={"age" in errors}
                            helperText={errors.age?.message}
                        />
                        <Button type="submit" variant="contained">Submit</Button>
                    </Stack>
                </form>
                
                <div className={styles.textBoxTitle}>API Response</div>
                <Box component="span" sx={{ p: 2, border: '1px dashed grey' }}>
                    {newgreeting}
                </Box>
            </main>
        </div>
    )
}
