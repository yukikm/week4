import Greeter from "artifacts/contracts/Greeters.sol/Greeters.json"
import { Contract, providers, utils } from "ethers"
import type { NextApiRequest, NextApiResponse } from "next"

// This API can represent a backend.
// The contract owner is the only account that can call the `greet` function,
// However they will not be aware of the identity of the users generating the proofs.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { greeting, nullifierHash, solidityProof } = JSON.parse(req.body)
    console.log(utils.formatBytes32String(greeting))

    const contract = new Contract("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", Greeter.abi)
    const provider = new providers.JsonRpcProvider("http://localhost:8545")

    const contractOwner = contract.connect(provider.getSigner())

    try {
        await contractOwner.greet(utils.formatBytes32String(greeting), nullifierHash, solidityProof)
        let greetingMessage = ''
        let eventMessage = contractOwner.on("NewGreeting", (greeting) => {
            greetingMessage = greeting
        })

        res.status(200).send(greetingMessage)
    } catch (error: any) {
        const { message } = JSON.parse(error.body).error
        const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))

        res.status(500).send(reason || "Unknown error!")
    }
}
