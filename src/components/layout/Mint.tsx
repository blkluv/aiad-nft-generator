import React, { useState } from 'react'
import {
  Button,
  Flex,
  Img,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useUploadToIpfs } from 'hooks/useUploadToIpfs'
import { ethers } from 'ethers'
import { contractAbi, contractAddress } from 'utils/contract'
import { useAccount, useNetwork, useSigner } from 'wagmi'
import { OPENSEA_ASSET_URL } from 'utils/config'
import { LinkComponent } from './LinkComponent'

interface Props {
  imageUrl: string
  text: string | undefined
}

export function Mint(props: Props) {
  const { data: signer } = useSigner()
  const { address } = useAccount()
  const { chain } = useNetwork()
  const toast = useToast()
  const imageUrl = props.imageUrl
  const text = props.text
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [name, setName] = useState('')
  const [mintStatus, setMintStatus] = useState('OPEN')
  const [minted, setMinted] = useState('')
  const [description, setDescription] = useState('')
  const [url, setURL] = useState('')
  const { loading: ipfsLoading, data: ipfsHash, error } = useUploadToIpfs(url, text)

  function getIpfs(cid: string): string {
    return 'https://ipfs.io/ipfs/' + cid
  }
  async function uploadToIPFS() {
    setURL(imageUrl + '&v=' + Math.random())
  }

  async function mint() {
    const uri = JSON.stringify({
      name: name,
      description: description,
      image: ipfsHash ? getIpfs(ipfsHash) : imageUrl,
    })
    const tokenURI = 'data:application/json;base64,' + btoa(uri)
    if (!signer) {
      toast({
        title: 'Connect Your Wallet',
        description: 'Please Connect Your Wallet To Continue',
        status: 'warning',
        duration: 9000,
        isClosable: true,
      })
      console.log('connect wallet')
      return
    }
    const contract = new ethers.Contract(contractAddress[chain?.id], contractAbi, signer)
    setMintStatus('MINTING')
    try {
      const mintTx = await contract.safeMint(address, tokenURI)
      setMintStatus('WAITING')
      const txReceipt = await mintTx.wait(2)
      const tokenId = txReceipt.events[0].args.tokenId
      setMintStatus('MINTED')
      setMinted(`${OPENSEA_ASSET_URL[chain?.id]}/${contractAddress[chain?.id]}/${tokenId}`)
    } catch (e) {
      setMintStatus('OPEN')
      console.log(e)
    }
  }
  if (!imageUrl) return null
  return (
    <>
      <Button
        borderTopRadius={0}
        colorScheme="teal"
        size="lg"
        variant={'outline'}
        width={'100%'}
        whiteSpace={'normal'}
        onClick={onOpen}>
        MINT NFT
      </Button>

      <Modal onClose={onClose} isOpen={isOpen} scrollBehavior="outside">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Minting AI Generated NFT</ModalHeader>
          <ModalCloseButton
            onClick={() => {
              if (mintStatus === 'MINTED') {
                setMintStatus('OPEN')
                setMinted('')
                onClose()
              } else {
                onClose()
              }
            }}
          />
          <ModalBody display={'flex'} flexDirection="column" gap={2}>
            <Button
              isDisabled={Boolean(ipfsHash?.length > 0)}
              isLoading={ipfsLoading}
              onClick={uploadToIPFS}
              colorScheme="teal">
              {ipfsHash ? 'Uploaded To IPFS' : 'Upload Image To IPFS'}
            </Button>
            <Img src={imageUrl} alt={text} borderRadius={10} />
            {mintStatus === 'MINTED' ? (
              <Flex py={4} gap={2} direction="column" alignItems={'center'}>
                <Text
                  textTransform={'uppercase'}
                  fontWeight={'bold'}>{`${name} NFT Minted Succesfully.`}</Text>
                <LinkComponent href={minted}>
                  <Button colorScheme="teal">View On Opensea</Button>
                </LinkComponent>
              </Flex>
            ) : (
              <Flex gap={2} direction="column">
                <Flex alignItems="center">
                  <Text fontWeight={'bold'}>Enter Information for your NFT</Text>
                  <Spacer />
                  <Button
                    onClick={() => {
                      setName(
                        String(text).split(' ')[0] +
                          ' ' +
                          String(text).split(' ')[1] +
                          ' ' +
                          String(text).split(' ')[2]
                      )
                      setDescription(String(text))
                    }}>
                    Auto Fill
                  </Button>
                </Flex>
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  size="lg"
                />
                <Textarea
                  placeholder={`Description ( e.g. ${text} )`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  size="lg"
                  rows={3}
                />
              </Flex>
            )}
          </ModalBody>
          <ModalFooter gap={2} justifyContent={'left'}>
            <Button
              disabled={mintStatus !== 'OPEN'}
              isLoading={mintStatus !== 'OPEN' && mintStatus !== 'MINTED'}
              loadingText={
                mintStatus === 'MINTING'
                  ? 'Confirm In Wallet'
                  : mintStatus === 'WAITING'
                  ? 'Waiting for Confirmation'
                  : ''
              }
              onClick={mint}
              colorScheme="teal">
              {mintStatus === 'MINTED' ? 'Minted' : 'MINT'}
            </Button>
            <Spacer />
            <Button
              onClick={() => {
                if (mintStatus === 'MINTED') {
                  setMintStatus('OPEN')
                  setMinted('')
                  onClose()
                } else {
                  onClose()
                }
              }}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
