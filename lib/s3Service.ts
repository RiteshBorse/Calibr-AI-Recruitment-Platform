// Comprehensive S3 service - centralized S3 operations for the entire application
//
// File Naming Strategy:
// - S3 bucket versioning is DISABLED
// - Each file is stored with a UUID-based key for uniqueness
// - Format: {folderPrefix}/{userId}/{uuid}.{extension}
// - Original filename is preserved in S3 metadata
// - No version management needed - each upload creates a separate object
//
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Check if we're on the server side
const isServer = typeof window === "undefined";

// Debug environment variables only on server
if (isServer) {
  // console.log("Environment check:", {
  //   AWS_REGION: process.env.AWS_REGION,
  //   AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "Set" : "Missing",
  //   AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
  //     ? "Set"
  //     : "Missing",
  //   AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  // });
}

// Configure S3 client - shared across all operations (server-side only)
let s3Client: S3Client;

if (isServer) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Validate required environment variables only on server side
if (isServer && !S3_BUCKET_NAME) {
  throw new Error("AWS_S3_BUCKET_NAME environment variable is required");
}

if (isServer) {
  // console.log("S3 Configuration:", {
  //   region: process.env.AWS_REGION || "us-east-1",
  //   bucket: S3_BUCKET_NAME,
  // });
}

// ============== TYPES & INTERFACES ==============

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string; // Original filename
  fileSize?: number;
  s3Key?: string; // UUID-based key
  uuid?: string; // The UUID used in the key
  message?: string;
  error?: string;
}

export interface UploadConfig {
  folderPrefix: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  userId: string;
  userRole?: "candidate" | "employer" | string;
  metadata?: Record<string, string>;
}

// ============== S3 SERVICE - CENTRALIZED ==============

export const S3Service = {
  // ========== CORE S3 OPERATIONS ==========

  /**
   * Delete a single object from S3
   */
  async deleteObject(key: string): Promise<void> {
    if (!isServer) {
      throw new Error("S3 operations can only be performed on the server side");
    }

    if (!S3_BUCKET_NAME) {
      throw new Error("S3 bucket name is not configured");
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(deleteCommand);
  },

  /**
   * Delete multiple objects from S3
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteObject(key));
    await Promise.all(deletePromises);
  },

  /**
   * Delete all objects with a specific prefix
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
      });

      const listResponse = await s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deletePromises = listResponse.Contents.filter(
          (obj) => obj.Key
        ).map((obj) => this.deleteObject(obj.Key!));

        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error("Failed to delete objects by prefix:", error);
      throw error;
    }
  },

  /**
   * Download object from S3 with enhanced error handling
   */
  async download(key: string): Promise<any> {
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    try {
      const s3Response = await s3Client.send(getCommand);
      return s3Response;
    } catch (s3Error: any) {
      console.error("Failed to download file from S3:", s3Error);

      if (
        s3Error.name === "NoSuchKey" ||
        s3Error.$metadata?.httpStatusCode === 404
      ) {
        throw new Error(
          `File was not found in S3 storage. It may have been moved or deleted.`
        );
      } else if (
        s3Error.name === "AccessDenied" ||
        s3Error.$metadata?.httpStatusCode === 403
      ) {
        throw new Error(
          "Insufficient permissions to access the file in storage."
        );
      } else if (s3Error.$metadata?.httpStatusCode === 500) {
        throw new Error(
          "S3 storage service is currently unavailable. Please try again later."
        );
      } else {
        throw new Error(
          `S3 Error: ${s3Error.message || "Unknown storage error"}`
        );
      }
    }
  },

  /**
   * Convert S3 response to File object
   */
  async downloadAsFile(
    s3Response: any,
    fileName: string,
    mimeType: string
  ): Promise<File> {
    if (!s3Response.Body) {
      throw new Error("Empty file received from storage");
    }

    const chunks: Uint8Array[] = [];
    const reader = s3Response.Body.transformToWebStream().getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return new File([buffer], fileName, { type: mimeType });
  },

  /**
   * Upload object directly to S3 (low-level operation)
   */
  async uploadObject(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    if (!S3_BUCKET_NAME) {
      throw new Error("S3 bucket name is not configured");
    }


    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await s3Client.send(uploadCommand);

    return `https://${S3_BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${key}`;
  },

  /**
   * List objects with a specific prefix
   */
  async list(prefix: string): Promise<string[]> {
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(listCommand);
    return response.Contents?.map((obj) => obj.Key!).filter(Boolean) || [];
  },

  /**
   * Check if object exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.download(key);
      return true;
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return false;
      }
      throw error;
    }
  },

  /**
   * Get object metadata without downloading the file
   */
  async getMetadata(key: string): Promise<Record<string, string> | null> {
    try {
      const response = await this.download(key);
      return response.Metadata || null;
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return null;
      }
      throw error;
    }
  },

  // ========== HIGH-LEVEL UPLOAD FUNCTION ==========

  /**
   * Upload a file with automatic UUID generation and validation
   */
  async upload(file: File, config: UploadConfig): Promise<UploadResult> {
    try {
      // Validate file first
      const validation = this.validate(file, config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate UUID-based filename and S3 key
      const fileExtension = file.name.split(".").pop() || "";
      const uuid = randomUUID();
      const fileName = `${uuid}.${fileExtension}`;
      const s3Key = `${config.folderPrefix}/${config.userId}/${fileName}`;

      // Prepare metadata with UUID and original filename mapping
      const metadata = {
        originalName: file.name,
        uuid: uuid,
        userId: config.userId,
        userRole: config.userRole || "user",
        uploadedAt: new Date().toISOString(),
        ...config.metadata,
      };

      // Upload to S3
      const fileUrl = await this.uploadObject(
        s3Key,
        buffer,
        file.type,
        metadata
      );

      return {
        success: true,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        s3Key,
        uuid,
        message: "File uploaded successfully",
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message || "Failed to upload file",
      };
    }
  },

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Validate file type and size
   */
  validate(
    file: File,
    config: UploadConfig
  ): { valid: boolean; error?: string } {
    // Check file type
    const isValidType = config.allowedFileTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      const typeStr = config.allowedFileTypes
        .join(", ")
        .replace("/*", " files");
      return { valid: false, error: `File must be: ${typeStr}` };
    }

    // Check file size
    if (file.size > config.maxFileSize) {
      const maxSizeMB = Math.round(config.maxFileSize / (1024 * 1024));
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  },

  /**
   * Parse S3 key to extract components
   * Format: {folderPrefix}/{userId}/{uuid}.{extension}
   */
  parseKey(s3Key: string): {
    folderPrefix: string;
    userId: string;
    fileName: string;
    uuid: string;
    extension: string;
  } {
    const parts = s3Key.split("/");
    if (parts.length < 3) {
      throw new Error(
        "Invalid S3 key format. Expected: {folderPrefix}/{userId}/{uuid}.{extension}"
      );
    }

    const fileName = parts.slice(2).join("/");
    const [uuid, ...extensionParts] = fileName.split(".");
    const extension = extensionParts.join(".");

    return {
      folderPrefix: parts[0],
      userId: parts[1],
      fileName,
      uuid,
      extension,
    };
  },

  /**
   * Generate file URL from S3 key
   */
  getUrl(s3Key: string): string {
    if (!S3_BUCKET_NAME || !process.env.AWS_REGION) {
      throw new Error("S3 configuration is missing");
    }
    return `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  },
};

// ============== EXPORTS ==============

// Export the S3 client and bucket name for advanced usage
export { s3Client, S3_BUCKET_NAME };
