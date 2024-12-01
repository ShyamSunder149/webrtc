import { useEffect, useRef } from "react"

export function Receiver() {

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080')

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'receiver' }))
        }

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data)
            let pc: RTCPeerConnection | null = null;

            if (message.type === 'createOffer') {
                pc = new RTCPeerConnection()
                pc.setRemoteDescription(message.sdp);
                pc.onicecandidate = (event) => {
                    console.log(event)
                    if (event.candidate) {
                        socket.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }))
                    }
                }

                pc.ontrack = (event) => {
                    console.log(event)
                    if (videoRef.current) {
                        const stream = new MediaStream();
                        stream.addTrack(event.track);
                        event.streams.forEach((stream) => {
                            stream.getTracks().forEach((track) => stream.addTrack(track))
                        })
                        videoRef.current.srcObject = stream
                        videoRef.current.play()
                    }
                }

                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }))
            } else if (message.type === 'iceCandidate') {
                if (pc !== null) {
                    //@ts-ignore
                    pc.addIceCandidate(message.candidate);
                }
            }
        }
    }, [])

    return (
        <div className="flex flex-col">
            <div className="text-2xl">Host's Stream</div>
            <video ref={videoRef}></video>
        </div>
    )
}