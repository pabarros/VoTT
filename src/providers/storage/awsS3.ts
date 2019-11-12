import { IStorageProvider } from "./storageProviderFactory";
import { IAsset, AssetType, StorageType } from "../../models/applicationState";
import { AssetService } from "../../services/assetService";
// import {
//     TokenCredential, AnonymousCredential, ContainerURL,
//     StorageURL, ServiceURL, Credential, Aborter, BlockBlobURL,
// } from "@azure/storage-blob";

import { S3 } from 'aws-sdk';
import { string } from "prop-types";
import { Connection } from "aws-sdk/clients/directconnect";

/**
 * Options for AWS S3 Storage
 * @member accessKeyId - Access Key to AWS account
 * @member secretAccessKeyId - Secret Key to AWS account
 * @member bucket - Bucket where files are stored in S3
 * @member folder - Folder to images in S3
 * @member region - AWS region
 * @member apiVersion - Version of API to use, default to `latest`
 */

// IAzureCloudStorageOptions
export interface IAwsS3Options {
    accessKeyId: string;
    secretAccessKeyId: string;
    bucket: string;
    folder: string;
    region: string;
    apiVersion?: string;
}

/**
 * Storage Provider for AWS S3
 */
export class AwsS3 implements IStorageProvider {

    /**
     * Storage type
     * @returns - StorageType.Cloud
     */
    public storageType: StorageType = StorageType.Cloud;

    /**
     * Singleton to S3 connection
     */
    private S3Connection: S3;

    constructor(private options?: IAwsS3Options) {
        if (!this.options.apiVersion) {
            this.options.apiVersion = 'latest';
        }
    }

    /**
     * Initialize connection to AWS S3 account
     * @throws - Error if finds a error to list files from bucket
     * or not able to connect to AWS S3
     */
    public async initialize(): Promise<void> {
        const files = await this.listContainers(null);
        console.log("files from aws s3", files)
    }

    /**
     * @returns - Full path containing S3 `bucket` and `folder`
     */
    private getFullPath(): string {
        return `${this.options.bucket}/${this.options.folder}`;
    }

    /**
     * Reads text from specified blob
     * @param blobName - Name of blob in container
     */
    public async readText(blobName: string): Promise<string> {
        const blockBlobURL = this.getBlockBlobURL(blobName);
        const downloadResponse = await blockBlobURL.download(Aborter.none, 0);

        return await this.bodyToString(downloadResponse);
    }

    /**
     * Reads Buffer from specified blob
     * @param blobName - Name of blob in container
     */
    public async readBinary(blobName: string) {
        const text = await this.readText(blobName);
        return Buffer.from(text);
    }

    /**
     * Writes text to blob in container
     * @param blobName - Name of blob in container
     * @param content - Content to write to blob (string or Buffer)
     */
    public async writeText(blobName: string, content: string | Buffer) {
        // const blockBlobURL = this.getBlockBlobURL(blobName);
        // await blockBlobURL.upload(
        //     Aborter.none,
        //     content,
        //     content.length,
        // );
        throw new Error('writeText not implemented');
    }

    /**
     * Writes buffer to blob in container
     * @param blobName - Name of blob in container
     * @param content - Buffer to write to blob
     */
    public writeBinary(blobName: string, content: Buffer) {
        return this.writeText(blobName, content);
    }

    /**
     * Deletes file from container
     * @param blobName - Name of blob in container
     */
    public async deleteFile(blobName: string): Promise<void> {
        // await this.getBlockBlobURL(blobName).delete(Aborter.none);
        throw new Error('deleteFile not implemented');
    }

    /**
     * Lists files in container
     * @param path - NOT USED IN CURRENT IMPLEMENTATION. Only uses container
     * as specified in AWS S3 Optinos. Included to satisfy
     * Storage Provider interface
     * @param ext - Extension of files to filter on when retrieving files
     * from container
     */
    public async listFiles(path: string, ext?: string): Promise<string[]> {
        const files = await this.listContainers(null);
        return <string[]>files.filter(file => !!ext ? file.endsWith(ext) : true)
    }

    /**
     * Lists the containers with AWS S3 account
     * @param path - NOT USED IN THIS FUNCTION. Included to satisfy
     * Storage Provider interface
     */
    public async listContainers(path: string) {

        const bucket = this.options.bucket;

        const listObjectsOutput = await this.getS3Connection().listObjectsV2({
            Bucket: bucket,
            Prefix: this.options.folder
        }).promise();

        /**
         * Use slice to remove first el
         * that references to folder itself
         */
        const filesOnly = listObjectsOutput.Contents.slice(1);

        return <string[]>filesOnly.map(file => `${bucket}${file}`);
    }

    /**
     * Creates container specified in AWS S3
     * @param containerName - NOT USED IN CURRENT IMPLEMENTATION. Included to satisfy interface
     */
    public async createContainer(containerName: string): Promise<void> {
        throw new Error('createContainer not implemented for AwsS3 provider');
    }

    /**
     * Deletes container specified in AWS S3
     * @param containerName - NOT USED IN CURRENT IMPLEMENTATION. Included to satisfy interface
     */
    public async deleteContainer(containerName: string): Promise<void> {
        throw new Error('deleteContainer not implemented for AwsS3 provider');
    }

    /**
     * Retrieves assets from AWS S3 container
     * @param containerName - Container from which to retrieve assets. Defaults to
     * container specified in AWS S3 options
     */
    public async getAssets(containerName?: string): Promise<IAsset[]> {
        // containerName = (containerName) ? containerName : this.options.containerName;
        // const files = await this.listFiles(containerName);
        // const result: IAsset[] = [];
        // for (const file of files) {
        //     const url = this.getUrl(file);
        //     const asset = AssetService.createAssetFromFilePath(url, this.getFileName(url));
        //     if (asset.type !== AssetType.Unknown) {
        //         result.push(asset);
        //     }
        // }
        // return result;
        throw new Error('getAssets not implemented for AwsS3 provider');
    }

    /**
     *
     * @param url - URL for Azure Blob
     */
    public getFileName(url: string) {
        const pathParts = url.split("/");
        return pathParts[pathParts.length - 1].split("?")[0];
    }

    /**
     * @returns - S3 Connection
     */
    public getAccountUrl(): string {
        return `https://${this.options.accountName}.blob.core.windows.net` + (this.options.sas || "");
    }

    /**
     * Connect to AWS S3
     * @returns - A S3 singleton connection
     */
    private getS3Connection(): S3 {
        if (!this.S3Connection) {
            this.S3Connection = new S3({
                region: this.options.region,
                apiVersion: this.options.apiVersion,
                accessKeyId: this.options.accessKeyId,
                secretAccessKey: this.options.secretAccessKeyId,
            })
        }
        return this.S3Connection;
    }

    private getContainerURL(serviceURL?: ServiceURL, containerName?: string): ContainerURL {
        // return ContainerURL.fromServiceURL(
        //     (serviceURL) ? serviceURL : this.getServiceURL(),
        //     (containerName) ? containerName : this.options.containerName,
        // );
        throw new Error('getContainerURL not implemented for AwsS3 provider');
    }

    private getBlockBlobURL(blobName: string): BlockBlobURL {
        // const containerURL = this.getContainerURL();
        // return BlockBlobURL.fromContainerURL(
        //     containerURL,
        //     blobName,
        // );
        throw new Error('getBlockBlobURL not implemented for AwsS3 provider');
    }

    private getUrl(blobName: string): string {
        // return this.getBlockBlobURL(blobName).url;
        throw new Error('getUrl not implemented for AwsS3 provider');
    }

    private async bodyToString(
        response: {
            readableStreamBody?: NodeJS.ReadableStream;
            blobBody?: Promise<Blob>;
        },
        // tslint:disable-next-line:variable-name
        _length?: number,
    ): Promise<string> {
        // const blob = await response.blobBody!;
        // return this.blobToString(blob);
        throw new Error('bodyToString not implemented for AwsS3 provider');
    }

    private async blobToString(blob: Blob): Promise<string> {
        // const fileReader = new FileReader();

        // return new Promise<string>((resolve, reject) => {
        //     fileReader.onloadend = (ev: any) => {
        //         resolve(ev.target!.result);
        //     };
        //     fileReader.onerror = reject;
        //     fileReader.readAsText(blob);
        // });
        throw new Error('blobToString not implemented for AwsS3 provider');
    }
}
